import os
import json
import shutil
import subprocess
import uuid
import tempfile
import time
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
import base64
import logging

logger = logging.getLogger(__name__)


class BuildCancelledException(Exception):
    """Build anile pa itilizatè."""
    pass

# Configuration avec timeouts augmentés (guide diagnostic)
DEPENDENCY_TIMEOUT = 900   # 15 min
GRADLE_TIMEOUT = 1800     # 30 min
PREBUILD_TIMEOUT = 600    # 10 min

# Configuration
def _resolve_build_dir() -> Path:
    if os.name != "nt":
        return Path(tempfile.gettempdir()) / "taptapgo-builds"
    # Windows: toujours un chemin court pour éviter MAX_PATH (260 car.)
    env_value = os.getenv("TAPTAPGO_BUILD_DIR", "C:\\tb")
    candidate = Path(env_value)
    if " " in str(candidate) or len(str(candidate)) > 12:
        candidate = Path("C:\\tb")
    return candidate


BUILD_DIR = _resolve_build_dir()


# Dossiers à ne JAMAIS supprimer (cache Gradle, etc.)
_CLEAN_EXCLUDE = frozenset({"gradle"})


def _clean_stale_work_dirs(keep_key: Optional[str] = None, max_age_seconds: int = 3600) -> int:
    """Supprime les anciens dossiers de travail sous BUILD_DIR (nettoyage propre).
    Exclut le cache Gradle pour éviter FileNotFoundException sur metadata.bin."""
    if not BUILD_DIR.exists():
        return 0
    removed = 0
    try:
        now = time.time()
        for path in list(BUILD_DIR.iterdir()):
            if not path.is_dir():
                continue
            if path.name in _CLEAN_EXCLUDE:
                continue
            if keep_key and path.name == keep_key:
                continue
            try:
                age = now - path.stat().st_mtime
                if age > max_age_seconds:
                    shutil.rmtree(path, ignore_errors=True)
                    removed += 1
                    logger.info(f"Netwaye ansyen dosye: {path}")
            except OSError:
                pass
    except OSError as e:
        logger.warning(f"Pa kapab netwaye BUILD_DIR: {e}")
    return removed
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "builds"
BUILD_LOG_DIR = OUTPUT_DIR / "logs"
BASE_PROJECT_PATH = Path(
    os.getenv(
        "TAPTAPGO_BASE_PROJECT_PATH",
        str(Path(__file__).resolve().parents[2] / "frontend"),
    )
)
STORAGE_BUCKET = os.getenv("TAPTAPGO_BUILDS_BUCKET", "builds")


class BuildService:
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self._cancel_requested: Dict[str, bool] = {}
        BUILD_DIR.mkdir(exist_ok=True)
        OUTPUT_DIR.mkdir(exist_ok=True)
        BUILD_LOG_DIR.mkdir(exist_ok=True)

    def request_cancel(self, build_id: str) -> None:
        """Demande l'annulation d'un build en cours."""
        self._cancel_requested[build_id] = True
        logger.info(f"Cancel requested for build {build_id}")

    def _is_cancelled(self, build_id: str) -> bool:
        """Retourne True si annulation demandée et retire la demande."""
        return self._cancel_requested.pop(build_id, False)

    def _peek_cancelled(self, build_id: str) -> bool:
        """Retourne True si annulation demandée, sans retirer la demande (pour le watchdog)."""
        return self._cancel_requested.get(build_id, False)

    def _check_cancelled(self, build_id: str) -> None:
        """Lève BuildCancelledException si l'utilisateur a demandé l'annulation."""
        if self._is_cancelled(build_id):
            raise BuildCancelledException("Build anile pa itilizatè")

    def _has_running_build(self) -> bool:
        """Vérifie s'il existe déjà un build en cours (queued ou building)."""
        try:
            r = self.supabase.table("builds").select("id").or_(
                "status.eq.queued,status.eq.building"
            ).execute()
            return bool(r.data and len(r.data) > 0)
        except Exception as e:
            logger.warning(f"Check running build: {e}")
            return False

    async def create_build(self, brand_id: str, config: Dict[str, Any]) -> str:
        """Créer un nouveau build APK (un seul à la fois)."""
        build_id = str(uuid.uuid4())

        # Un seul build à la fois
        if self._has_running_build():
            raise Exception(
                "Gen yon build k ap mache. Tann li fini oswa anile li anvan ou lanse yon lòt."
            )

        # Vérifications préalables
        self._check_prerequisites()

        # Créer l'enregistrement dans la DB
        try:
            self.supabase.table("builds").insert(
                {
                    "id": build_id,
                    "brand_id": brand_id,
                    "status": "queued",
                    "progress": 0,
                    "message": "Build an preparasyon...",
                    "created_at": datetime.utcnow().isoformat(),
                }
            ).execute()
        except Exception as e:
            logger.error(f"Database insert error: {e}")
            raise

        # Lancer le build en arrière-plan
        import threading

        thread = threading.Thread(
            target=self._build_apk,
            args=(build_id, brand_id, config),
            daemon=True,
        )
        thread.start()

        return build_id

    def _check_prerequisites(self):
        """Vérifier les prérequis avant de lancer le build"""
        errors = []
        sdk_root = os.getenv("ANDROID_HOME") or os.getenv("ANDROID_SDK_ROOT")
        if not sdk_root:
            errors.append("ANDROID_HOME/ANDROID_SDK_ROOT pa konfigire")
        elif not Path(sdk_root).exists():
            errors.append(f"Android SDK pa jwenn nan {sdk_root}")
        node = shutil.which("node") or shutil.which("node.exe")
        if not node:
            errors.append("Node.js pa enstale oswa pa nan PATH")
        npm = shutil.which("npm") or shutil.which("npm.cmd")
        if not npm:
            errors.append("npm pa enstale oswa pa nan PATH")
        if not BASE_PROJECT_PATH.exists():
            errors.append(f"Pwojè debaz pa jwenn nan {BASE_PROJECT_PATH}")
        # Windows: vérifier que le dossier de build court existe et est utilisable
        if os.name == "nt":
            try:
                BUILD_DIR.mkdir(parents=True, exist_ok=True)
                test_file = BUILD_DIR / ".write_test"
                test_file.write_text("ok")
                test_file.unlink()
            except OSError as e:
                errors.append(f"Dosye build pa kapab kreye oswa ekri nan {BUILD_DIR}: {e}")
        if errors:
            raise Exception("Prerequis ki manke:\n- " + "\n- ".join(errors))

    def _build_apk(self, build_id: str, brand_id: str, config: Dict[str, Any]):
        """Générer l'APK (exécuté en arrière-plan)"""
        work_dir: Optional[Path] = None
        subst_drive: Optional[str] = None
        try:
            logger.info(f"Starting build {build_id} for brand {brand_id}")
            self._check_cancelled(build_id)
            self._update_progress(build_id, "building", 3, "Nettoyage ansyen builds...")

            # 0. Nettoyage propre: supprimer les anciens dossiers de travail
            work_key = build_id.split("-")[0]
            _clean_stale_work_dirs(keep_key=work_key, max_age_seconds=3600)

            self._check_cancelled(build_id)
            self._update_progress(build_id, "building", 5, "Inisyalizasyon...")

            # 1. Créer le dossier de travail (toujours propre)
            work_dir = BUILD_DIR / work_key
            if work_dir.exists():
                logger.info(f"Cleaning existing work dir: {work_dir}")
                shutil.rmtree(work_dir, ignore_errors=True)
                time.sleep(1)
            work_dir.mkdir(parents=True, exist_ok=True)

            self._update_progress(build_id, "building", 10, "Kopi pwojè debaz...")

            # 2. Copier le projet de base
            # Utilise un dossier court pour eviter les chemins trop longs sous Windows
            copy_target_dir = work_dir / "a"
            if not BASE_PROJECT_PATH.exists():
                raise Exception(f"Pwojè debaz pa jwenn nan {BASE_PROJECT_PATH}")

            shutil.copytree(
                BASE_PROJECT_PATH,
                copy_target_dir,
                dirs_exist_ok=True,
                ignore=shutil.ignore_patterns(
                    "node_modules",
                    ".git",
                    ".expo",
                    ".expo-shared",
                    ".metro-cache",
                    ".cache",
                    "dist",
                    "build",
                    "android",
                    "ios",
                    "coverage",
                    "tmp",
                    "logs",
                    "test_reports",
                    "test_results",
                    "memory",
                    "*.apk",
                    "*.aab",
                ),
                ignore_dangling_symlinks=True,
            )
            app_dir = copy_target_dir
            # Ne pas utiliser SUBST sur Windows : React Native codegen echwe ak "different roots"
            # (Z:\ vs C:\) lè Gradle tcheke chemen relatif ant node_modules.
            # C:\tb\xxx\a se kout ase pou evite MAX_PATH.
            subst_drive = None
            if os.name == "nt" and os.getenv("TAPTAPGO_USE_SUBST", "").lower() in ("1", "true", "yes"):
                subst_drive = self._create_subst_drive(work_dir)
                if subst_drive:
                    app_dir = Path(f"{subst_drive}:\\") / "a"
                    logger.info(f"Using SUBST drive: {subst_drive}:")
                else:
                    subst_drive = None
            if subst_drive is None:
                logger.info("Ap kontinye san SUBST (evite erè codegen Z: vs C:)")

            self._update_progress(build_id, "building", 20, "Pesonalizasyon app.json...")

            # 3. Personnaliser app.json
            self._customize_app_json(app_dir, config)

            self._update_progress(build_id, "building", 25, "Sovgad logo...")

            # 4. Sauvegarder le logo
            if config.get("logo"):
                self._save_logo(app_dir, config["logo"])

            self._update_progress(build_id, "building", 30, "Pesonalizasyon koulè yo...")

            # 5. Personnaliser les couleurs
            self._customize_colors(app_dir, config)

            self._check_cancelled(build_id)
            self._update_progress(build_id, "building", 35, "Konfigirasyon mak la...")

            # 5b. Injecter la config de marque (brand id/name)
            self._customize_brand_config(app_dir, config)

            self._check_cancelled(build_id)
            build_mode = str(config.get("build_mode") or "local").lower()
            if build_mode == "cloud":
                self._update_progress(build_id, "building", 55, "Build cloud (EAS) an preparasyon...")
                build_url, eas_build_id = self._build_with_eas(app_dir, build_id, config)
                self.supabase.table("builds").update(
                    {
                        "status": "building",
                        "progress": 70,
                        "apk_url": build_url,
                        "message": "Build cloud lanse. Ouvri lyen pou swiv. Apre sa ou ka soumèt nan Play Store.",
                        "eas_build_id": eas_build_id or None,
                    }
                ).eq("id", build_id).execute()
                return

            self._update_progress(build_id, "building", 40, "Enstalasyon depandans yo...")

            # 6. Installer les dépendances
            self._install_dependencies(app_dir, build_id)

            self._update_progress(build_id, "building", 55, "Jenerasyon APK la...")

            # 7. Build APK
            apk_path = self._build_with_expo(app_dir, build_id)

            self._update_progress(build_id, "building", 85, "Copie de l'APK...")

            # 8. Copier l'APK dans le dossier de sortie
            output_path = OUTPUT_DIR / brand_id
            output_path.mkdir(exist_ok=True)

            company_slug = config["company_name"].replace(" ", "-").lower()
            timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
            final_apk = output_path / f"{company_slug}-v1.0.0-{timestamp}.apk"

            if not apk_path.exists():
                raise Exception(f"APK pa jwenn nan {apk_path}")

            shutil.copy(apk_path, final_apk)

            public_url = None
            upload_error = None
            local_only = bool(config.get("local_only"))
            if not local_only:
                self._update_progress(build_id, "building", 90, "Upload vers Supabase Storage...")
                storage_path = f"{brand_id}/{final_apk.name}"
                try:
                    public_url = self._upload_to_storage(final_apk, storage_path)
                except Exception as e:
                    upload_error = str(e)
                    logger.error(f"Upload failed for build {build_id}: {e}")
                    self._update_progress(
                        build_id,
                        "building",
                        90,
                        "Upload echwe, ap itilize lyen lokal...",
                    )
            else:
                self._update_progress(build_id, "building", 90, "Mòd lokal: pa gen upload...")

            self._update_progress(build_id, "building", 95, "Finalisation...")

            # 9. Marquer comme terminé
            self.supabase.table("builds").update(
                {
                    "status": "success",
                    "progress": 100,
                    "apk_path": str(final_apk),
                    "apk_url": public_url or f"/api/superadmin/builds/download/{build_id}",
                    "message": (
                        "APK pare! Telechaje li kounye a."
                        if public_url
                        else "APK pare (lokal)."
                        if local_only
                        else "APK pare. Upload echwe, lyen lokal aktive."
                    ),
                    "completed_at": datetime.utcnow().isoformat(),
                }
            ).eq("id", build_id).execute()

            logger.info(f"Build {build_id} completed successfully")

        except BuildCancelledException as e:
            logger.info(f"Build {build_id} anile pa itilizatè")
            self.supabase.table("builds").update(
                {
                    "status": "failed",
                    "progress": 0,
                    "message": "Build anile pa itilizatè",
                    "completed_at": datetime.utcnow().isoformat(),
                }
            ).eq("id", build_id).execute()
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Build {build_id} echwe: {error_msg}", exc_info=True)
            self.supabase.table("builds").update(
                {
                    "status": "failed",
                    "progress": 0,
                    "error": error_msg,
                    "message": f"Erè: {error_msg[:200]}",
                    "completed_at": datetime.utcnow().isoformat(),
                }
            ).eq("id", build_id).execute()

        finally:
            self._cancel_requested.pop(build_id, None)
            if subst_drive:
                self._remove_subst_drive(subst_drive)
            if work_dir and work_dir.exists():
                try:
                    time.sleep(2)
                    shutil.rmtree(work_dir, ignore_errors=True)
                    logger.info(f"Netwaye dosye travay pou build {build_id}")
                except Exception as e:
                    logger.warning(f"Pa kapab netwaye dosye travay: {e}")

    def _customize_app_json(self, app_dir: Path, config: Dict[str, Any]):
        """Personnaliser app.json"""
        app_json_path = app_dir / "app.json"

        if not app_json_path.exists():
            raise Exception("app.json pa jwenn nan pwojè debaz")

        with open(app_json_path, "r", encoding="utf-8") as f:
            app_json = json.load(f)

        company_slug = config["company_name"].replace(" ", "-").lower()
        # Sanitize pour package Android (lettres, chiffres uniquement)
        pkg_base = "".join(c for c in config["company_name"] if c.isalnum()).lower() or "app"
        # Unicité: ajouter 6 premiers caractères du brand_id pour éviter collisions
        brand_id = str(config.get("brand_id", ""))
        short_id = "".join(c for c in brand_id if c.isalnum())[:6] if brand_id else str(uuid.uuid4())[:6]
        package_name = f"{pkg_base}_{short_id}" if short_id else pkg_base

        # Personnaliser les métadonnées
        app_json["expo"]["name"] = config["company_name"]
        app_json["expo"]["slug"] = company_slug

        # Package Android
        if "android" not in app_json["expo"]:
            app_json["expo"]["android"] = {}

        app_json["expo"]["android"]["package"] = f"com.taptapgo.{package_name}"
        app_json["expo"]["android"]["versionCode"] = 1

        # Logo
        logo_path = "./assets/logo.png"
        if config.get("logo"):
            app_json["expo"]["icon"] = logo_path

            if "adaptiveIcon" not in app_json["expo"]["android"]:
                app_json["expo"]["android"]["adaptiveIcon"] = {}

            app_json["expo"]["android"]["adaptiveIcon"]["foregroundImage"] = logo_path
            app_json["expo"]["android"]["adaptiveIcon"]["backgroundColor"] = config.get(
                "primary_color", "#FFFFFF"
            )

            # Mise à jour du splash screen (expo-splash-screen) pour éviter erreur image manquante
            plugins = app_json.get("expo", {}).get("plugins", [])
            for i, p in enumerate(plugins):
                if isinstance(p, (list, tuple)) and len(p) >= 2 and p[0] == "expo-splash-screen":
                    opts = dict(p[1]) if isinstance(p[1], dict) else {}
                    opts["image"] = logo_path
                    opts["backgroundColor"] = config.get("primary_color", "#FFFFFF")
                    plugins[i] = ["expo-splash-screen", opts]
                    break

            if "web" in app_json.get("expo", {}):
                app_json["expo"]["web"]["favicon"] = logo_path

        # Version
        app_json["expo"]["version"] = "1.0.0"

        with open(app_json_path, "w", encoding="utf-8") as f:
            json.dump(app_json, f, indent=2, ensure_ascii=False)
        logger.info("app.json configured successfully")

    def _save_logo(self, app_dir: Path, logo_base64: str):
        """Sauvegarder le logo depuis base64"""
        assets_dir = app_dir / "assets"
        assets_dir.mkdir(exist_ok=True)

        try:
            # Décoder base64
            if "," in logo_base64:
                logo_data = logo_base64.split(",")[1]
            else:
                logo_data = logo_base64

            logo_bytes = base64.b64decode(logo_data)

            logo_path = assets_dir / "logo.png"
            with open(logo_path, "wb") as f:
                f.write(logo_bytes)

            logger.info(f"Logo saved to {logo_path}")
        except Exception as e:
            logger.error(f"Failed to save logo: {e}")
            raise Exception(f"Failed to decode and save logo: {e}")

    def _customize_colors(self, app_dir: Path, config: Dict[str, Any]):
        """Personnaliser les couleurs dans constants/colors.ts"""
        colors_file = app_dir / "src" / "constants" / "colors.ts"

        if not colors_file.exists():
            logger.warning(f"Fichye colors.ts pa jwenn, skip pesonalizasyon koulè")
            return

        colors_content = f"""// Auto-generated colors for {config['company_name']}
export const Colors = {{
  primary: '{config['primary_color']}',
  secondary: '{config['secondary_color']}',
  tertiary: '{config.get('tertiary_color', '#F4B400')}',

  // Couleurs UI système
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  error: '#D32F2F',
  success: '#388E3C',
  warning: '#F57C00',
  info: '#1976D2',
}};

export const Shadows = {{
  small: {{
    shadowColor: '#000',
    shadowOffset: {{ width: 0, height: 2 }},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  }},
  medium: {{
    shadowColor: '#000',
    shadowOffset: {{ width: 0, height: 4 }},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  }},
  large: {{
    shadowColor: '#000',
    shadowOffset: {{ width: 0, height: 8 }},
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  }},
}};
"""

        with open(colors_file, "w", encoding="utf-8") as f:
            f.write(colors_content)

    def _customize_brand_config(self, app_dir: Path, config: Dict[str, Any]):
        """Injecter l'ID de marque dans constants/brand.ts"""
        brand_file = app_dir / "src" / "constants" / "brand.ts"
        brand_id = config.get("brand_id", "")
        brand_name = config.get("company_name", "")
        content = (
            "export const BRAND_ID = '{brand_id}';\n"
            "export const BRAND_NAME = '{brand_name}';\n"
            "export const isWhiteLabelApp = Boolean(BRAND_ID);\n"
        ).format(
            brand_id=str(brand_id).replace("'", "\\'"),
            brand_name=str(brand_name).replace("'", "\\'"),
        )
        with open(brand_file, "w", encoding="utf-8") as f:
            f.write(content)
        logger.info("Brand config configured successfully")

    def _upload_to_storage(self, file_path: Path, storage_path: str) -> Optional[str]:
        """Uploader un APK dans Supabase Storage"""
        try:
            with open(file_path, "rb") as f:
                self.supabase.storage.from_(STORAGE_BUCKET).upload(
                    path=storage_path,
                    file=f,
                    file_options={
                        "content-type": "application/vnd.android.package-archive",
                        "upsert": "true",
                    },
                )

            public = self.supabase.storage.from_(STORAGE_BUCKET).get_public_url(storage_path)
            if isinstance(public, dict):
                return public.get("publicURL") or public.get("publicUrl")
            return public
        except Exception as e:
            logger.error(f"Storage upload failed: {e}")
            raise

    def _install_dependencies(self, app_dir: Path, build_id: str):
        """Installer les dépendances npm avec logs détaillés"""
        try:
            use_yarn = (app_dir / "yarn.lock").exists()
            if use_yarn:
                cmd = ["yarn", "install", "--frozen-lockfile", "--network-timeout", "100000"]
                exe = shutil.which("yarn") or shutil.which("yarn.cmd")
            else:
                cmd = ["npm", "install", "--legacy-peer-deps"]
                exe = shutil.which("npm") or shutil.which("npm.cmd")

            if not exe:
                raise Exception("npm/yarn pa jwenn nan PATH")

            cmd[0] = exe
            logger.info(f"Installing dependencies: {' '.join(cmd)}")
            log_path = BUILD_LOG_DIR / f"{build_id}-npm.log"
            with open(log_path, "w", encoding="utf-8") as log_file:
                log_file.write("=== Dependency installation ===\n")
                log_file.write(f"Command: {' '.join(cmd)}\n")
                log_file.write(f"Working dir: {app_dir}\n\n")

            result = subprocess.run(
                cmd,
                cwd=app_dir,
                capture_output=True,
                text=True,
                timeout=DEPENDENCY_TIMEOUT,
            )
            with open(log_path, "a", encoding="utf-8") as log_file:
                log_file.write(result.stdout or "")
                log_file.write(result.stderr or "")

            if result.returncode != 0:
                raise Exception(
                    f"Enstalasyon depandans echwe. Log: {log_path}\n{result.stderr[:500]}"
                )
            logger.info("Dependencies installed successfully")
        except subprocess.TimeoutExpired:
            raise Exception(
                f"Enstalasyon depandans timeout apre {DEPENDENCY_TIMEOUT // 60} minit"
            )
        except Exception as e:
            raise Exception(f"Erè nan enstalasyon depandans: {e}")

    def _build_with_expo(self, app_dir: Path, build_id: str) -> Path:
        """Build APK avec Expo - timeouts et logs améliorés"""
        try:
            self._update_progress(build_id, "building", 60, "Prebuild Expo...")
            logger.info("Starting Expo prebuild...")
            local_expo = app_dir / "node_modules" / ".bin" / ("expo.cmd" if os.name == "nt" else "expo")
            if local_expo.exists():
                prebuild_cmd = [str(local_expo), "prebuild", "--platform", "android", "--clean"]
            else:
                npx = shutil.which("npx") or shutil.which("npx.cmd")
                if not npx:
                    raise Exception("npx pa jwenn nan PATH")
                prebuild_cmd = [npx, "expo", "prebuild", "--platform", "android", "--clean"]

            logger.info(f"Prebuild command: {' '.join(prebuild_cmd)}")
            result = subprocess.run(
                prebuild_cmd,
                cwd=app_dir,
                capture_output=True,
                text=True,
                timeout=PREBUILD_TIMEOUT,
            )
            if result.returncode != 0:
                log_path = BUILD_LOG_DIR / f"{build_id}-prebuild.log"
                with open(log_path, "w", encoding="utf-8") as f:
                    f.write(result.stdout or "")
                    f.write(result.stderr or "")
                raise Exception(
                    f"expo prebuild echwe. Log: {log_path}\n{result.stderr[:500]}"
                )

            self._update_progress(build_id, "building", 70, "Gradle build...")
            logger.info("Prebuild completed, starting Gradle build...")
            android_dir = app_dir / "android"
            if not android_dir.exists():
                raise Exception("Dosye android pa jenere apre prebuild")
            sdk_root = os.getenv("ANDROID_HOME") or os.getenv("ANDROID_SDK_ROOT")
            if not sdk_root:
                raise Exception("ANDROID_HOME/ANDROID_SDK_ROOT pa konfigire")
            gradlew = android_dir / ("gradlew.bat" if os.name == "nt" else "gradlew")
            if not gradlew.exists():
                raise Exception(f"Gradle wrapper pa jwenn nan {gradlew}")
            if os.name != "nt":
                os.chmod(gradlew, 0o755)

            # Optimiser Gradle: cache + une seule ABI (arm64-v8a) = build 2–4x plus rapide
            self._optimize_gradle_for_speed(android_dir)

            self._update_progress(build_id, "building", 75, "Gradle compilation...")
            gradle_cmd = [
                str(gradlew),
                "assembleRelease",
                "--parallel",
                "--build-cache",
                "--stacktrace",
                "-x", "lint",
                "-x", "test",
                "-PreactNativeArchitectures=arm64-v8a",
                "--console=plain",
            ]
            log_path = BUILD_LOG_DIR / f"{build_id}-gradle.log"
            env = os.environ.copy()
            if os.name == "nt":
                # Utiliser le cache Gradle par defaut (%USERPROFILE%\.gradle) au lieu de C:\tb\gradle
                # pour eviter metadata.bin corrompu (C:\tb\gradle se korompi ant builds)
                custom_gradle = os.getenv("TAPTAPGO_GRADLE_HOME")
                if custom_gradle:
                    env["GRADLE_USER_HOME"] = custom_gradle
                # else: ne pas setter GRADLE_USER_HOME -> Gradle utilise %USERPROFILE%\.gradle
                env["TMP"] = str(BUILD_DIR)
                env["TEMP"] = str(BUILD_DIR)
            logger.info(f"Gradle command: {' '.join(gradle_cmd)}")
            process = subprocess.Popen(
                gradle_cmd,
                cwd=android_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                env=env,
            )
            start = time.time()
            last_update = start
            last_lines = []
            with open(log_path, "w", encoding="utf-8") as log_file:
                log_file.write("=== Gradle build output ===\n")
                log_file.write(f"Command: {' '.join(gradle_cmd)}\n")
                log_file.write(f"Working dir: {android_dir}\n\n")

            # Watchdog: vérifier l'annulation toutes les 5 s même si Gradle n'imprime rien (readline bloque)
            import threading
            cancelled_by_watchdog = [False]  # list pour partage mutable entre threads

            def _gradle_watchdog():
                try:
                    while True:
                        time.sleep(5)
                        if process.poll() is not None:
                            return
                        if self._peek_cancelled(build_id):
                            cancelled_by_watchdog[0] = True
                            process.kill()
                            return
                except Exception as e:
                    logger.warning(f"Gradle watchdog: {e}")

            watchdog = threading.Thread(target=_gradle_watchdog, daemon=True)
            watchdog.start()

            while True:
                line = process.stdout.readline() if process.stdout else ""
                if line:
                    cleaned = line.strip()
                    last_lines.append(cleaned)
                    last_lines = last_lines[-100:]
                    with open(log_path, "a", encoding="utf-8") as log_file:
                        log_file.write(cleaned + "\n")
                if process.poll() is not None:
                    break
                now = time.time()
                if self._is_cancelled(build_id):
                    process.kill()
                    raise BuildCancelledException("Build anile pa itilizatè")
                if now - last_update > 15:
                    elapsed = int(now - start)
                    last_line = last_lines[-1] if last_lines else "Gradle ap travay..."
                    msg = f"{last_line[:150]} ({elapsed}s)"
                    self._update_progress(build_id, "building", 75, msg)
                    last_update = now
                if now - start > GRADLE_TIMEOUT:
                    process.kill()
                    raise Exception(
                        f"Gradle build timeout apre {GRADLE_TIMEOUT // 60} minit"
                    )

            if cancelled_by_watchdog[0]:
                raise BuildCancelledException("Build anile pa itilizatè")
            if self._is_cancelled(build_id):
                raise BuildCancelledException("Build anile pa itilizatè")

            if process.returncode != 0:
                tail = "\n".join(last_lines[-30:])
                raise Exception(
                    f"Gradle build echwe (code {process.returncode}).\n"
                    f"Dernye liy yo:\n{tail}\n"
                    f"Log konplè: {log_path}"
                )
            self._update_progress(build_id, "building", 80, "APK compilation fini!")

            apk_path = android_dir / "app" / "build" / "outputs" / "apk" / "release" / "app-release.apk"
            if not apk_path.exists():
                possible_paths = [
                    android_dir / "app" / "build" / "outputs" / "apk" / "release" / "app-release-unsigned.apk",
                    android_dir / "app" / "build" / "outputs" / "apk" / "app-release.apk",
                ]
                for path in possible_paths:
                    if path.exists():
                        apk_path = path
                        break
                else:
                    raise Exception(f"APK pa jwenn. Tcheke log: {log_path}")
            logger.info(f"APK built successfully: {apk_path} ({apk_path.stat().st_size} bytes)")
            return apk_path

        except subprocess.TimeoutExpired:
            raise Exception("Build timeout")
        except Exception as e:
            logger.error(f"Build echwe: {e}")
            raise

    def _build_with_eas(self, app_dir: Path, build_id: str, config: Dict[str, Any]) -> Tuple[str, Optional[str]]:
        """Lancer un build cloud via EAS. Retourne (build_url, eas_build_id) pour EAS Submit."""
        try:
            eas = shutil.which("eas") or shutil.which("eas.cmd")
            if eas:
                cmd = [eas, "build", "-p", "android", "--profile", "preview", "--non-interactive", "--no-wait", "--json"]
            else:
                npx = shutil.which("npx") or shutil.which("npx.cmd")
                if not npx:
                    raise Exception("eas/npx pa jwenn nan PATH")
                cmd = [npx, "eas", "build", "-p", "android", "--profile", "preview", "--non-interactive", "--no-wait", "--json"]

            env = os.environ.copy()
            env["EXPO_PUBLIC_BRAND_ID"] = str(config.get("brand_id", ""))
            env["EXPO_PUBLIC_BRAND_NAME"] = str(config.get("company_name", ""))
            backend_url = os.getenv("EXPO_PUBLIC_BACKEND_URL") or os.getenv("TAPTAPGO_PUBLIC_BACKEND_URL") or ""
            if backend_url:
                env["EXPO_PUBLIC_BACKEND_URL"] = backend_url
                env["EXPO_PUBLIC_BACKEND_URL_ANDROID"] = backend_url
            if os.getenv("EXPO_TOKEN"):
                env["EXPO_TOKEN"] = os.getenv("EXPO_TOKEN")

            # --no-wait: on n'attend que la soumission (upload + file d'attente), pas la fin du build sur Expo.
            # Timeout 10 min pour la phase upload/soumission ; le build continue sur expo.dev.
            result = subprocess.run(
                cmd,
                cwd=app_dir,
                capture_output=True,
                text=True,
                timeout=600,
                env=env,
            )

            if result.returncode != 0:
                raise Exception(f"EAS build echwe: {result.stderr or result.stdout}")

            build_url = ""
            eas_build_id = None
            for line in (result.stdout or "").splitlines()[::-1]:
                line = line.strip()
                if not line:
                    continue
                if line.startswith("{") or line.startswith("["):
                    try:
                        payload = json.loads(line)
                        if isinstance(payload, list) and payload:
                            payload = payload[0]
                        if isinstance(payload, dict):
                            build_url = payload.get("buildUrl") or payload.get("build_url") or ""
                            eas_build_id = payload.get("id") or payload.get("buildId")
                            if build_url or eas_build_id:
                                break
                    except Exception:
                        continue
            if not build_url:
                build_url = "https://expo.dev/accounts/your-account/projects"
            return (build_url, eas_build_id)
        except subprocess.TimeoutExpired:
            raise Exception("Soumission EAS timed out (upload/file d'attente depase 10 min)")
        except Exception as e:
            logger.error(f"EAS build failed: {e}")
            raise

    def _optimize_gradle_for_speed(self, android_dir: Path) -> None:
        """Active le cache Gradle et optimise la mémoire pour accélérer assembleRelease."""
        props_path = android_dir / "gradle.properties"
        if not props_path.exists():
            return
        try:
            text = props_path.read_text(encoding="utf-8")
            lines = text.splitlines()
            seen = {line.split("=")[0].strip() for line in lines if "=" in line and not line.strip().startswith("#")}
            additions = []
            if "org.gradle.caching" not in seen:
                additions.append("org.gradle.caching=true")
            if "org.gradle.parallel" not in seen:
                additions.append("org.gradle.parallel=true")
            if "org.gradle.jvmargs" in seen:
                for i, line in enumerate(lines):
                    if line.strip().startswith("org.gradle.jvmargs="):
                        if "-Xmx2048m" in line or "-Xmx1024m" in line:
                            lines[i] = line.replace("-Xmx2048m", "-Xmx4096m").replace("-Xmx1024m", "-Xmx4096m")
                        break
            if additions:
                lines.extend([""] + ["# Optimisations build (BuildService)"] + additions)
            props_path.write_text("\n".join(lines), encoding="utf-8")
            logger.info("gradle.properties optimisé: cache, parallel, mémoire")
        except Exception as e:
            logger.warning(f"Pa kapab optimize gradle.properties: {e}")

    def _update_progress(self, build_id: str, status: str, progress: int, message: str = ""):
        """Mettre à jour la progression du build"""
        try:
            self.supabase.table("builds").update(
                {
                    "status": status,
                    "progress": progress,
                    "message": message,
                }
            ).eq("id", build_id).execute()

            logger.info(f"Build {build_id}: {progress}% - {message}")
        except Exception as e:
            logger.error(f"Failed to update progress: {e}")

    def clear_build_cache(self) -> Dict[str, Any]:
        """Netwaye cache build (dossiers temporaires + logs)"""
        removed = []
        errors = []
        for target in [BUILD_DIR, BUILD_LOG_DIR]:
            try:
                if target.exists():
                    shutil.rmtree(target, ignore_errors=True)
                    time.sleep(1)
                    target.mkdir(exist_ok=True)
                    removed.append(str(target))
            except Exception as e:
                errors.append(f"{target}: {e}")
        return {"removed": removed, "errors": errors}

    def _create_subst_drive(self, work_dir: Path) -> Optional[str]:
        """Créer un lecteur SUBST pour raccourcir les chemins (Windows)."""
        if os.name != "nt":
            return None
        for letter in "ZYXWVUTSRQPONMLKJIHGFEDCBA":
            drive_path = f"{letter}:\\"
            if not os.path.exists(drive_path):
                result = subprocess.run(
                    ["cmd", "/c", "subst", f"{letter}:", str(work_dir)],
                    capture_output=True,
                    text=True,
                )
                if result.returncode == 0:
                    logger.info(f"SUBST drive kreye: {letter}: -> {work_dir}")
                    return letter
        logger.warning("Pa gen lèt disponib pou SUBST")
        return None

    def _remove_subst_drive(self, letter: str):
        """Supprimer le lecteur SUBST."""
        if os.name != "nt":
            return
        try:
            subprocess.run(
                ["cmd", "/c", "subst", f"{letter}:", "/D"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            logger.info(f"SUBST drive retire: {letter}:")
        except Exception as e:
            logger.warning(f"Pa kapab retire SUBST drive: {e}")

    def get_build_status(self, build_id: str) -> Optional[Dict[str, Any]]:
        """Obtenir le statut d'un build"""
        try:
            result = self.supabase.table("builds").select("*").eq("id", build_id).execute()
            if result.data:
                return result.data[0]
            return None
        except Exception as e:
            logger.error(f"Failed to get build status: {e}")
            return None

    def list_builds(self, brand_id: Optional[str] = None) -> list:
        """Lister tous les builds"""
        try:
            query = self.supabase.table("builds").select("*").order("created_at", desc=True)

            if brand_id:
                query = query.eq("brand_id", brand_id)

            result = query.execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Failed to list builds: {e}")
            return []

    def submit_build_to_play_store(self, build_id: str, track: str = "internal") -> Dict[str, Any]:
        """Soumèt un build EAS (cloud) nan Google Play Store via EAS Submit."""
        build = self.get_build_status(build_id)
        if not build:
            raise Exception("Build pa jwenn")
        eas_build_id = build.get("eas_build_id")
        if not eas_build_id:
            raise Exception(
                "Se build cloud (EAS) ki ka soumèt nan Play Store. "
                "Lanse yon 'Build rapid' (cloud) pou mak la, tann li fini, epi soumèt."
            )
        track = (track or "internal").lower()
        if track not in ("internal", "alpha", "beta", "production"):
            track = "internal"
        try:
            self.supabase.table("builds").update(
                {"submit_status": "submitting", "submit_track": track}
            ).eq("id", build_id).execute()
            eas = shutil.which("eas") or shutil.which("eas.cmd")
            if eas:
                cmd = [eas, "submit", "--platform", "android", "--id", str(eas_build_id), "--track", track, "--non-interactive"]
            else:
                npx = shutil.which("npx") or shutil.which("npx.cmd")
                if not npx:
                    raise Exception("eas/npx pa jwenn nan PATH")
                cmd = [npx, "eas", "submit", "--platform", "android", "--id", str(eas_build_id), "--track", track, "--non-interactive"]
            env = os.environ.copy()
            if os.getenv("EXPO_TOKEN"):
                env["EXPO_TOKEN"] = os.getenv("EXPO_TOKEN")
            result = subprocess.run(
                cmd,
                cwd=str(BASE_PROJECT_PATH),
                capture_output=True,
                text=True,
                timeout=600,
                env=env,
            )
            if result.returncode != 0:
                err = result.stderr or result.stdout or "Erè enkonni"
                self.supabase.table("builds").update(
                    {"submit_status": "failed", "submit_track": track}
                ).eq("id", build_id).execute()
                raise Exception(f"EAS Submit echwe: {err[:500]}")
            self.supabase.table("builds").update(
                {"submit_status": "submitted", "submit_track": track}
            ).eq("id", build_id).execute()
            logger.info(f"Build {build_id} submitted to Play Store track: {track}")
            return {"success": True, "message": f"Soumèt nan Play Store (track: {track}).", "track": track}
        except subprocess.TimeoutExpired:
            self.supabase.table("builds").update({"submit_status": "failed"}).eq("id", build_id).execute()
            raise Exception("EAS Submit timeout")
        except Exception as e:
            if "submit_status" not in str(e):
                self.supabase.table("builds").update({"submit_status": "failed"}).eq("id", build_id).execute()
            raise

    def clear_failed_builds(self, brand_id: Optional[str] = None) -> Dict[str, Any]:
        """Supprimer l'historique des builds échoués"""
        try:
            query = self.supabase.table("builds").delete().eq("status", "failed")
            if brand_id:
                query = query.eq("brand_id", brand_id)
            result = query.execute()
            return {"deleted": len(result.data or [])}
        except Exception as e:
            logger.error(f"Failed to clear failed builds: {e}")
            raise
