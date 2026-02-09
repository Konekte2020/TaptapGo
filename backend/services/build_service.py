import os
import json
import shutil
import subprocess
import uuid
import tempfile
import time
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional
import base64
import logging

logger = logging.getLogger(__name__)

# Configuration
def _resolve_build_dir() -> Path:
    if os.name != "nt":
        return Path(tempfile.gettempdir()) / "taptapgo-builds"
    env_value = os.getenv("TAPTAPGO_BUILD_DIR", "C:\\tb")
    candidate = Path(env_value)
    # Forcer un chemin court sur Windows pour eviter les erreurs de longueur
    if " " in str(candidate) or len(str(candidate)) > 10:
        candidate = Path("C:\\tb")
    return candidate


BUILD_DIR = _resolve_build_dir()
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
        BUILD_DIR.mkdir(exist_ok=True)
        OUTPUT_DIR.mkdir(exist_ok=True)
        BUILD_LOG_DIR.mkdir(exist_ok=True)

    async def create_build(self, brand_id: str, config: Dict[str, Any]) -> str:
        """Créer un nouveau build APK"""
        build_id = str(uuid.uuid4())

        # Créer l'enregistrement dans la DB
        try:
            self.supabase.table("builds").insert(
                {
                    "id": build_id,
                    "brand_id": brand_id,
                    "status": "queued",
                    "progress": 0,
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

    def _build_apk(self, build_id: str, brand_id: str, config: Dict[str, Any]):
        """Générer l'APK (exécuté en arrière-plan)"""
        work_dir: Optional[Path] = None
        subst_drive: Optional[str] = None
        try:
            logger.info(f"Starting build {build_id} for brand {brand_id}")
            self._update_progress(build_id, "building", 5, "Initialisation...")

            # 1. Créer le dossier de travail
            work_key = build_id.split("-")[0]
            work_dir = BUILD_DIR / work_key
            work_dir.mkdir(exist_ok=True)

            self._update_progress(build_id, "building", 10, "Copie du projet de base...")

            # 2. Copier le projet de base
            # Utilise un dossier court pour eviter les chemins trop longs sous Windows
            copy_target_dir = work_dir / "a"
            if not BASE_PROJECT_PATH.exists():
                raise Exception(f"Base project not found at {BASE_PROJECT_PATH}")

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
                ),
                ignore_dangling_symlinks=True,
            )
            app_dir = copy_target_dir
            if os.name == "nt":
                subst_drive = self._create_subst_drive(work_dir)
                if subst_drive:
                    app_dir = Path(f"{subst_drive}:\\") / "a"
                else:
                    allow_long_paths = os.getenv("TAPTAPGO_ALLOW_LONG_PATHS", "").lower() in ("1", "true", "yes")
                    if allow_long_paths:
                        self._update_progress(
                            build_id,
                            "building",
                            12,
                            "SUBST pa disponib, ap kontinye ak chemen nòmal (long paths dwe aktive).",
                        )
                        app_dir = copy_target_dir
                    else:
                        raise Exception(
                            "SUBST pa disponib pou Windows. Mete TAPTAPGO_BUILD_DIR sou yon chemen kout (eg: C:\\tb) "
                            "oswa aktive long paths nan Windows epi mete TAPTAPGO_ALLOW_LONG_PATHS=1."
                        )

            self._update_progress(build_id, "building", 20, "Personnalisation app.json...")

            # 3. Personnaliser app.json
            self._customize_app_json(app_dir, config)

            self._update_progress(build_id, "building", 30, "Sauvegarde du logo...")

            # 4. Sauvegarder le logo
            if config.get("logo"):
                self._save_logo(app_dir, config["logo"])

            self._update_progress(build_id, "building", 40, "Personnalisation des couleurs...")

            # 5. Personnaliser les couleurs
            self._customize_colors(app_dir, config)

            self._update_progress(build_id, "building", 45, "Configuration de la marque...")

            # 5b. Injecter la config de marque (brand id/name)
            self._customize_brand_config(app_dir, config)

            build_mode = str(config.get("build_mode") or "local").lower()
            if build_mode == "cloud":
                self._update_progress(build_id, "building", 55, "Build cloud (EAS) an preparasyon...")
                build_url = self._build_with_eas(app_dir, build_id)
                self.supabase.table("builds").update(
                    {
                        "status": "building",
                        "progress": 70,
                        "apk_url": build_url,
                        "message": "Build cloud lanse. Ouvri lyen pou swiv.",
                    }
                ).eq("id", build_id).execute()
                return

            self._update_progress(build_id, "building", 50, "Installation des dépendances...")

            # 6. Installer les dépendances
            self._install_dependencies(app_dir)

            self._update_progress(build_id, "building", 60, "Génération de l'APK...")

            # 7. Build APK
            apk_path = self._build_with_expo(app_dir, build_id)

            self._update_progress(build_id, "building", 85, "Copie de l'APK...")

            # 8. Copier l'APK dans le dossier de sortie
            output_path = OUTPUT_DIR / brand_id
            output_path.mkdir(exist_ok=True)

            company_slug = config["company_name"].replace(" ", "-").lower()
            final_apk = output_path / f"{company_slug}-v1.0.0.apk"

            if not apk_path.exists():
                raise Exception(f"APK not found at {apk_path}")

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
                        "APK pare (lokal)."
                        if local_only
                        else "APK pare. Upload echwe, lyen lokal aktive."
                        if upload_error
                        else "APK pare."
                    ),
                    "completed_at": datetime.utcnow().isoformat(),
                }
            ).eq("id", build_id).execute()

            logger.info(f"Build {build_id} completed successfully")

        except Exception as e:
            logger.error(f"Build {build_id} failed: {e}", exc_info=True)
            self.supabase.table("builds").update(
                {
                    "status": "failed",
                    "error": str(e),
                    "completed_at": datetime.utcnow().isoformat(),
                }
            ).eq("id", build_id).execute()

        finally:
            # Nettoyer le dossier de travail
            if subst_drive:
                self._remove_subst_drive(subst_drive)
            if work_dir and work_dir.exists():
                try:
                    shutil.rmtree(work_dir)
                    logger.info(f"Cleaned up work directory for build {build_id}")
                except Exception as e:
                    logger.warning(f"Failed to clean up work directory: {e}")

    def _customize_app_json(self, app_dir: Path, config: Dict[str, Any]):
        """Personnaliser app.json"""
        app_json_path = app_dir / "app.json"

        if not app_json_path.exists():
            raise Exception("app.json not found in base project")

        with open(app_json_path, "r", encoding="utf-8") as f:
            app_json = json.load(f)

        company_slug = config["company_name"].replace(" ", "-").lower()
        package_name = config["company_name"].replace(" ", "").replace("-", "").lower()

        # Personnaliser les métadonnées
        app_json["expo"]["name"] = config["company_name"]
        app_json["expo"]["slug"] = company_slug

        # Package Android
        if "android" not in app_json["expo"]:
            app_json["expo"]["android"] = {}

        app_json["expo"]["android"]["package"] = f"com.taptapgo.{package_name}"
        app_json["expo"]["android"]["versionCode"] = 1

        # Logo
        if config.get("logo"):
            app_json["expo"]["icon"] = "./assets/logo.png"

            if "adaptiveIcon" not in app_json["expo"]["android"]:
                app_json["expo"]["android"]["adaptiveIcon"] = {}

            app_json["expo"]["android"]["adaptiveIcon"]["foregroundImage"] = "./assets/logo.png"
            app_json["expo"]["android"]["adaptiveIcon"]["backgroundColor"] = config.get(
                "primary_color", "#FFFFFF"
            )

        # Version
        app_json["expo"]["version"] = "1.0.0"

        with open(app_json_path, "w", encoding="utf-8") as f:
            json.dump(app_json, f, indent=2, ensure_ascii=False)

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
            logger.warning(f"Colors file not found at {colors_file}, skipping color customization")
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

    def _install_dependencies(self, app_dir: Path):
        """Installer les dépendances npm"""
        try:
            use_yarn = (app_dir / "yarn.lock").exists()
            if use_yarn:
                cmd = ["yarn", "install", "--frozen-lockfile"]
                exe = shutil.which("yarn") or shutil.which("yarn.cmd")
            else:
                cmd = ["npm", "install"]
                exe = shutil.which("npm") or shutil.which("npm.cmd")

            if not exe:
                raise Exception("Package manager not found in PATH (npm/yarn)")

            cmd[0] = exe
            result = subprocess.run(
                cmd,
                cwd=app_dir,
                capture_output=True,
                text=True,
                timeout=600,
            )

            if result.returncode != 0:
                raise Exception(f"Dependencies install failed: {result.stderr}")

            logger.info("Dependencies installed successfully")
        except subprocess.TimeoutExpired:
            raise Exception("Dependencies install timed out after 10 minutes")
        except Exception as e:
            raise Exception(f"Failed to install dependencies: {e}")

    def _build_with_expo(self, app_dir: Path, build_id: str) -> Path:
        """Build APK avec Expo"""
        try:
            self._update_progress(build_id, "building", 65, "Prébuild Expo...")
            logger.info("Starting Expo prebuild...")

            # Prebuild (génère les dossiers android/ios)
            local_expo = app_dir / "node_modules" / ".bin" / ("expo.cmd" if os.name == "nt" else "expo")
            if local_expo.exists():
                prebuild_cmd = [str(local_expo), "prebuild", "--platform", "android"]
            else:
                npx = shutil.which("npx") or shutil.which("npx.cmd")
                if not npx:
                    raise Exception("npx not found in PATH (needed for expo prebuild)")
                prebuild_cmd = [npx, "expo", "prebuild", "--platform", "android"]

            result = subprocess.run(
                prebuild_cmd,
                cwd=app_dir,
                capture_output=True,
                text=True,
                timeout=300,
            )

            if result.returncode != 0:
                raise Exception(f"expo prebuild failed: {result.stderr}")

            self._update_progress(build_id, "building", 70, "Gradle build...")
            logger.info("Prebuild completed, starting Gradle build...")

            # Build avec Gradle
            android_dir = app_dir / "android"
            if not android_dir.exists():
                raise Exception("Android folder not found after prebuild")

            sdk_root = os.getenv("ANDROID_HOME") or os.getenv("ANDROID_SDK_ROOT")
            if not sdk_root:
                raise Exception("ANDROID_HOME/ANDROID_SDK_ROOT not set (Android SDK required)")

            gradlew = android_dir / ("gradlew.bat" if os.name == "nt" else "gradlew")
            if not gradlew.exists():
                raise Exception(f"Gradle wrapper not found at {gradlew}")

            if os.name != "nt":
                os.chmod(gradlew, 0o755)

            self._update_progress(build_id, "building", 75, "Gradle en cours...")
            gradle_cmd = [
                str(gradlew),
                "assembleRelease",
                "--no-daemon",
                "--parallel",
                "--stacktrace",
                "-x",
                "lint",
                "-x",
                "test",
            ]
            log_path = BUILD_LOG_DIR / f"{build_id}-gradle.log"
            env = os.environ.copy()
            if os.name == "nt":
                env["GRADLE_USER_HOME"] = str(BUILD_DIR / "gradle")
                env["TMP"] = str(BUILD_DIR)
                env["TEMP"] = str(BUILD_DIR)
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
            while True:
                line = process.stdout.readline() if process.stdout else ""
                if line:
                    cleaned = line.strip()
                    last_lines.append(cleaned)
                    last_lines = last_lines[-50:]
                    with open(log_path, "a", encoding="utf-8") as log_file:
                        log_file.write(cleaned + "\n")
                if process.poll() is not None:
                    break
                now = time.time()
                if now - last_update > 20:
                    last_line = last_lines[-1] if last_lines else "Gradle ap travay..."
                    self._update_progress(build_id, "building", 75, last_line[:200])
                    last_update = now
                if now - start > 1200:
                    process.kill()
                    raise Exception("Gradle build timed out")

            if process.returncode != 0:
                tail = "\n".join(last_lines[-20:])
                raise Exception(
                    "Gradle build failed.\n"
                    f"Dernye liy yo:\n{tail}\n"
                    f"Log konplè: {log_path}"
                )

            self._update_progress(build_id, "building", 80, "Compilation APK...")

            # L'APK sera dans android/app/build/outputs/apk/release/
            apk_path = (
                android_dir
                / "app"
                / "build"
                / "outputs"
                / "apk"
                / "release"
                / "app-release.apk"
            )

            if not apk_path.exists():
                raise Exception(f"APK not found at expected location: {apk_path}")

            logger.info(f"APK built successfully at {apk_path}")
            return apk_path

        except subprocess.TimeoutExpired:
            raise Exception("Build timed out")
        except Exception as e:
            logger.error(f"Build failed: {e}")
            raise

    def _build_with_eas(self, app_dir: Path, build_id: str) -> str:
        """Lancer un build cloud via EAS et retourner le lien du build."""
        try:
            eas = shutil.which("eas") or shutil.which("eas.cmd")
            if eas:
                cmd = [eas, "build", "-p", "android", "--profile", "preview", "--non-interactive", "--json"]
            else:
                npx = shutil.which("npx") or shutil.which("npx.cmd")
                if not npx:
                    raise Exception("eas/npx pa jwenn nan PATH")
                cmd = [npx, "eas", "build", "-p", "android", "--profile", "preview", "--non-interactive", "--json"]

            result = subprocess.run(
                cmd,
                cwd=app_dir,
                capture_output=True,
                text=True,
                timeout=300,
            )

            if result.returncode != 0:
                raise Exception(f"EAS build echwe: {result.stderr}")

            build_url = ""
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
                            if build_url:
                                break
                    except Exception:
                        continue
            if not build_url:
                build_url = "https://expo.dev/accounts/your-account/projects"
            return build_url
        except subprocess.TimeoutExpired:
            raise Exception("EAS build timed out")
        except Exception as e:
            logger.error(f"EAS build failed: {e}")
            raise

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
                    shutil.rmtree(target)
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
                    logger.info(f"Created SUBST drive {letter}: for {work_dir}")
                    return letter
        logger.warning("No available drive letter for SUBST")
        return None

    def _remove_subst_drive(self, letter: str):
        """Supprimer le lecteur SUBST."""
        if os.name != "nt":
            return
        subprocess.run(
            ["cmd", "/c", "subst", f"{letter}:", "/D"],
            capture_output=True,
            text=True,
        )

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
