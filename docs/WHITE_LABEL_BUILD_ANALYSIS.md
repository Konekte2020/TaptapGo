# Analyse White Label — Génère l'APK

## Vue d'ensemble du flux

1. **SuperAdmin** crée une marque (admin) avec logo, couleurs, villes
2. **SuperAdmin** clique « Jenere APK » pour lancer un build
3. Le backend copie le projet frontend, personnalise (app.json, logo, couleurs, brand.ts)
4. **Build local** : `npm install` → `expo prebuild` → Gradle `assembleRelease` → APK
5. **Build cloud (EAS)** : `eas build` → Expo gère le build
6. APK uploadé vers Supabase Storage (ou mòd lokal sèlman)

---

## Parties bloquantes identifiées et solutions

### 1. Sélection de la marque pour le build (FRONTEND)

**Problème** : `createdBrandName` n'est défini que lors de la *création* d'une marque. Si l'utilisateur rafraîchit la page ou veut builder une marque existante, le bouton « Jenere APK » reste désactivé.

**Solution** :
- Définir `createdBrandName` quand on édite une marque (`handleEditBrand`)
- Au chargement, si une seule marque a un logo, l'utiliser comme marque sélectionnée par défaut

---

### 2. Logo et splash screen (BUILD_SERVICE)

**Problème** :
- Le service sauvegarde le logo dans `assets/logo.png`
- L'icône est configurée vers `./assets/logo.png` ✓
- Le plugin **expo-splash-screen** reste sur `./assets/images/logo.png` → le splash échoue ou affiche une image par défaut

**Solution** : Mettre à jour aussi la config splash dans `app.json` lors de la personnalisation.

---

### 3. Nom de package Android (BUILD_SERVICE)

**Problème** : `package_name = company_name.replace(" ", "").lower()` peut produire des doublons (ex. « TapTapGo » et « TapTapGo Partner » → `com.taptapgo.taptapgo`).

**Solution** : Utiliser un identifiant unique : `com.taptapgo.{slug}_{short_id}` où `short_id` = 6 premiers caractères du `brand_id`.

---

### 4. Environnement de build (PRÉREQUIS)

| Prérequis | Windows | Vérification |
|-----------|---------|--------------|
| ANDROID_HOME ou ANDROID_SDK_ROOT | Obligatoire | Doit pointer vers le SDK Android |
| Node.js 18+ | Obligatoire | `node -v` |
| npm | Obligatoire | `npm -v` |
| Java 11+ | Obligatoire (Gradle) | `java -version` |
| Dossier build court | `C:\tb` par défaut | Créer `C:\tb` manuellement si besoin |
| EAS (cloud) | EXPO_TOKEN dans .env | Pour builds cloud et soumission Play Store |

---

### 5. Bucket Supabase « builds »

Le bucket `builds` doit exister dans Supabase Storage et être configuré en accès public pour les téléchargements.

---

### 6. Téléchargement APK (BACKEND)

Quand `local_only=True`, l'APK n'est pas uploadé. Le frontend utilise `/api/superadmin/builds/download/{id}` qui sert le fichier depuis `apk_path`. En production multi-instances, ce chemin peut ne pas exister sur toutes les machines → privilégier l’upload Supabase.

---

## Checklist avant de lancer un build

- [ ] Marque créée avec logo et couleurs
- [ ] `ANDROID_HOME` ou `ANDROID_SDK_ROOT` configuré
- [ ] Node.js et npm disponibles
- [ ] Java 11+ installé
- [ ] `C:\tb` existe (Windows)
- [ ] Pas de build déjà en cours (un seul à la fois)
- [ ] Pour build cloud : `EXPO_TOKEN` dans `.env`

---

## Structure des fichiers modifiés

| Fichier | Rôle |
|---------|------|
| `backend/services/build_service.py` | Personnalisation, prebuild, Gradle, EAS |
| `backend/server.py` | Routes `/superadmin/builds/*` |
| `frontend/app/superadmin/white-label.tsx` | UI White Label + génération APK |
| `frontend/src/services/api.ts` | `buildAPI` |
| `database_setup.sql` | Table `builds` |
