# Comment faire les builds EAS (app mobile)

Guide pas à pas pour configurer et lancer les builds EAS de l’app TapTapGo.

---

## 1. Prérequis

1. **Compte Expo**  
   - Créer un compte sur [expo.dev](https://expo.dev) si besoin.  
   - Se connecter en ligne de commande :  
     `npx expo login` ou `eas login`

2. **EAS CLI**  
   - Installer : `npm install -g eas-cli`  
   - Ou utiliser sans installation : `npx eas ...`

3. **Projet EAS lié**  
   - Depuis le dossier **frontend** : `cd frontend`  
   - Si le projet n’est pas encore lié à EAS : `eas init`  
   - Choisir « Link to existing project » ou « Create new project » sur [expo.dev](https://expo.dev).

**Note (Windows PowerShell)** : pour enchaîner plusieurs commandes, utiliser `;` au lieu de `&&`, ou exécuter les commandes une par une.

---

## 2. Configurer les variables (EAS Secrets)

Les builds utilisent les variables définies dans `eas.json` (actuellement `REPLACE_ME`). Il faut leur donner de **vraies valeurs** via les **EAS Secrets** (recommandé, sans mettre de secrets dans le repo).

Depuis le dossier **frontend** :

```bash
cd frontend
```

Créer chaque secret (remplace les valeurs par les tiennes) :

```bash
# URL de ton API backend (HTTPS une fois déployée)
eas secret:create --name EXPO_PUBLIC_BACKEND_URL --value "https://api.taptapgoht.com" --scope project

# Même URL pour Android (souvent identique)
eas secret:create --name EXPO_PUBLIC_BACKEND_URL_ANDROID --value "https://api.taptapgoht.com" --scope project

# Token Mapbox (cartes) – créer sur https://account.mapbox.com/
eas secret:create --name EXPO_PUBLIC_MAPBOX_TOKEN --value "pk.xxxxxxxxxxxxxxxx" --scope project
```

Optionnel (white-label) :

```bash
eas secret:create --name EXPO_PUBLIC_BRAND_ID --value "votre-brand-id" --scope project
eas secret:create --name EXPO_PUBLIC_BRAND_NAME --value "TapTapGo" --scope project
```

Vérifier les secrets :

```bash
eas secret:list
```

Les secrets sont utilisés à la place des valeurs `REPLACE_ME` de `eas.json` lors du build.

---

## 3. Lancer un build

### Option A : En ligne de commande

Depuis **frontend** :

```bash
# Build APK (test / preview)
eas build --profile preview --platform android

# Build AAB pour le Play Store (production)
eas build --profile production --platform android
```

Le build se fait dans le cloud. À la fin, tu reçois un lien pour télécharger l’APK ou l’AAB.

### Option B : Depuis l’app SuperAdmin (Build rapid)

1. Sur le **backend**, ajouter dans le `.env` :  
   `EXPO_TOKEN=ton_token_expo`  
   (créer le token sur [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens)).

2. Dans l’app (superadmin), créer une marque puis cliquer sur **« Build rapid »**.  
   Le serveur utilisera `EXPO_TOKEN` pour lancer un build EAS ; les **EAS Secrets** configurés à l’étape 2 seront utilisés pour ce build.

---

## 4. Récapitulatif

| Étape | Action |
|-------|--------|
| 1 | Compte Expo + `eas login` |
| 2 | `cd frontend` puis `eas secret:create` pour chaque variable (BACKEND_URL, MAPBOX_TOKEN, etc.) |
| 3 | Lancer un build : `eas build --profile preview --platform android` ou « Build rapid » dans le superadmin |

Une fois les secrets en place, tous les builds EAS (CLI ou superadmin) utiliseront la bonne URL d’API et le bon token Mapbox.
