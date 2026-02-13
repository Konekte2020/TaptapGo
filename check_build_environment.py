#!/usr/bin/env python3
"""
Script de vérification de l'environnement de build TapTapGo
Vérifie que tous les prérequis sont installés et configurés
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path
import platform

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_success(msg):
    print(f"{Colors.GREEN}✓ {msg}{Colors.END}")

def print_error(msg):
    print(f"{Colors.RED}✗ {msg}{Colors.END}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠ {msg}{Colors.END}")

def print_info(msg):
    print(f"{Colors.BLUE}ℹ {msg}{Colors.END}")

def check_command(cmd, name, install_hint=""):
    """Vérifie si une commande existe"""
    if shutil.which(cmd) or shutil.which(f"{cmd}.cmd") or shutil.which(f"{cmd}.exe"):
        try:
            result = subprocess.run(
                [cmd, "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            version = result.stdout.split('\n')[0] if result.stdout else result.stderr.split('\n')[0]
            print_success(f"{name} installé: {version}")
            return True
        except Exception:
            print_success(f"{name} installé")
            return True
    else:
        print_error(f"{name} NOT FOUND")
        if install_hint:
            print_info(f"  → {install_hint}")
        return False

def check_env_var(var, name, hint=""):
    """Vérifie si une variable d'environnement existe"""
    value = os.getenv(var)
    if value:
        if Path(value).exists():
            print_success(f"{name}: {value}")
            return True
        else:
            print_warning(f"{name} configuré mais chemin n'existe pas: {value}")
            if hint:
                print_info(f"  → {hint}")
            return False
    else:
        print_error(f"{name} NOT SET")
        if hint:
            print_info(f"  → {hint}")
        return False

def check_disk_space():
    """Vérifie l'espace disque disponible"""
    if platform.system() == "Windows":
        try:
            import ctypes
            free_bytes = ctypes.c_ulonglong(0)
            ctypes.windll.kernel32.GetDiskFreeSpaceExW(
                ctypes.c_wchar_p("C:\\"),
                None,
                None,
                ctypes.pointer(free_bytes)
            )
            free_gb = free_bytes.value / (1024**3)
        except Exception:
            print_warning("Impossible de vérifier l'espace disque (Windows)")
            return True
    else:
        try:
            stat = os.statvfs('/')
            free_gb = (stat.f_bavail * stat.f_frsize) / (1024**3)
        except Exception:
            print_warning("Impossible de vérifier l'espace disque")
            return True
    if free_gb >= 10:
        print_success(f"Espace disque: {free_gb:.1f} GB disponibles")
        return True
    else:
        print_warning(f"Espace disque: {free_gb:.1f} GB disponibles (minimum 10 GB recommandé)")
        return False

def check_android_sdk():
    """Vérifie la configuration Android SDK"""
    sdk_root = os.getenv("ANDROID_HOME") or os.getenv("ANDROID_SDK_ROOT")
    if not sdk_root:
        print_error("Android SDK non configuré")
        print_info("  → Installer Android Studio: https://developer.android.com/studio")
        print_info("  → Ou télécharger les command-line tools")
        return False
    sdk_path = Path(sdk_root)
    if not sdk_path.exists():
        print_error(f"Android SDK path n'existe pas: {sdk_root}")
        return False
    build_tools = sdk_path / "build-tools"
    if build_tools.exists():
        versions = list(build_tools.iterdir())
        if versions:
            print_success(f"Android SDK: {sdk_root}")
            print_success(f"Build tools: {len(versions)} version(s) installée(s)")
            return True
        else:
            print_warning("Android SDK trouvé mais aucun build tools installé")
            print_info("  → Installer via Android Studio ou sdkmanager")
            return False
    else:
        print_warning("Android SDK trouvé mais dossier build-tools manquant")
        return False

def check_java():
    """Vérifie Java JDK"""
    java_home = os.getenv("JAVA_HOME")
    if check_command("java", "Java"):
        try:
            result = subprocess.run(
                ["java", "-version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            version_line = result.stderr.split('\n')[0]
            if "version" in version_line:
                version_str = version_line.split('"')[1]
                major_version = int(version_str.split('.')[0])
                if major_version >= 11:
                    print_success(f"Java version OK: {version_str}")
                    if java_home:
                        print_success(f"JAVA_HOME: {java_home}")
                    return True
                else:
                    print_warning(f"Java version trop ancienne: {version_str} (minimum Java 11)")
                    return False
        except Exception:
            pass
        return True
    return False

def check_node():
    """Vérifie Node.js"""
    if check_command("node", "Node.js", "Installer depuis https://nodejs.org/"):
        try:
            result = subprocess.run(
                ["node", "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            version = result.stdout.strip()
            major_version = int(version.replace('v', '').split('.')[0])
            if major_version >= 18:
                print_success(f"Node.js version OK: {version}")
                return True
            else:
                print_warning(f"Node.js version trop ancienne: {version} (minimum v18)")
                return False
        except Exception:
            return True
    return False

def check_build_directories():
    """Vérifie les dossiers de build"""
    build_dir = os.getenv("TAPTAPGO_BUILD_DIR", "C:\\tb" if platform.system() == "Windows" else "/tmp/taptapgo-builds")
    build_path = Path(build_dir)
    try:
        build_path.mkdir(parents=True, exist_ok=True)
        print_success(f"Dossier de build: {build_dir}")
        return True
    except Exception as e:
        print_error(f"Impossible de créer le dossier de build: {e}")
        return False

def check_project_structure():
    """Vérifie la structure du projet"""
    current_dir = Path.cwd()
    checks = [
        ("backend/server.py", "Fichier serveur backend"),
        ("backend/services/build_service.py", "Service de build"),
        ("frontend/app.json", "Configuration Expo"),
        ("frontend/package.json", "Package.json frontend"),
        ("frontend/src/constants/colors.ts", "Fichier couleurs"),
        ("frontend/src/constants/brand.ts", "Fichier marque"),
    ]
    all_ok = True
    for path, desc in checks:
        full_path = current_dir / path
        if full_path.exists():
            print_success(f"{desc}: {path}")
        else:
            print_warning(f"{desc} non trouvé: {path}")
            all_ok = False
    return all_ok

def generate_env_template():
    """Génère un template .env"""
    template = """# Configuration TapTapGo Build Environment

# OBLIGATOIRE - Android SDK
ANDROID_HOME=/path/to/android/sdk
# ou
# ANDROID_SDK_ROOT=/path/to/android/sdk

# OPTIONNEL - Java (si pas dans PATH)
# JAVA_HOME=/path/to/jdk

# OPTIONNEL - Dossier de build (Windows recommandé: C:\\tb)
# TAPTAPGO_BUILD_DIR=C:\\tb

# OPTIONNEL - Autoriser les chemins longs sur Windows
# TAPTAPGO_ALLOW_LONG_PATHS=1

# OPTIONNEL - Chemin du projet frontend
# TAPTAPGO_BASE_PROJECT_PATH=/path/to/frontend

# OPTIONNEL - Bucket Supabase
# TAPTAPGO_BUILDS_BUCKET=builds

# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key

# JWT
JWT_SECRET=your-jwt-secret
"""
    env_file = Path.cwd() / ".env.template"
    try:
        with open(env_file, "w", encoding="utf-8") as f:
            f.write(template)
        print_success(f"Template .env créé: {env_file}")
        print_info("  → Copier vers .env et configurer les valeurs")
    except Exception as e:
        print_error(f"Erreur création template: {e}")

def main():
    print("\n" + "="*60)
    print("  TapTapGo Build Environment Checker")
    print("="*60 + "\n")
    results = []
    print("📋 Système:")
    print(f"  OS: {platform.system()} {platform.release()}")
    print(f"  Architecture: {platform.machine()}")
    results.append(check_disk_space())
    print()
    print("🔧 Outils requis:")
    results.append(check_node())
    results.append(check_command("npm", "npm", "Installé avec Node.js"))
    check_command("yarn", "Yarn (optionnel)", "npm install -g yarn")
    results.append(check_java())
    print()
    print("📱 Android SDK:")
    results.append(check_android_sdk())
    print()
    print("🌍 Variables d'environnement:")
    results.append(check_env_var(
        "ANDROID_HOME",
        "ANDROID_HOME",
        "Définir vers le dossier Android SDK"
    ))
    if platform.system() == "Windows":
        check_env_var(
            "TAPTAPGO_BUILD_DIR",
            "TAPTAPGO_BUILD_DIR (optionnel)",
            "Recommandé: C:\\tb pour éviter les chemins longs"
        )
    print()
    print("📁 Structure du projet:")
    check_project_structure()
    print()
    print("🏗️ Dossiers de build:")
    results.append(check_build_directories())
    print()
    print("="*60)
    passed = sum(results)
    total = len(results)
    if passed == total:
        print_success(f"✓ Tous les tests passés ({passed}/{total})")
        print_info("\nVous pouvez lancer des builds APK!")
    else:
        print_warning(f"⚠ {passed}/{total} tests passés")
        print_info("\nCorrigez les problèmes ci-dessus avant de lancer des builds")
    print("="*60 + "\n")
    if len(sys.argv) > 1 and sys.argv[1] == "--generate-env":
        generate_env_template()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrompu par l'utilisateur")
        sys.exit(1)
    except Exception as e:
        print_error(f"\nErreur inattendue: {e}")
        sys.exit(1)
