# EAS Build (cloud) + EAS Submit - TapTapGo

## Résumé

- **Build cloud** : utilisez le bouton **« Build rapid »** pour lancer un build EAS (Expo Application Services). Plus besoin d’Android SDK en local.
- **Soumettre au Play Store** : une fois le build cloud terminé, le bouton **« Soumèt Play Store »** envoie l’app vers Google Play (track au choix : internal, alpha, beta, production).

## Prérequis

1. **Compte Expo** : [expo.dev](https://expo.dev) – connectez-vous avec `npx expo login` ou `eas login`.
2. **EAS CLI** : `npm install -g eas-cli` ou utilisez `npx eas`.
3. **Token Expo (backend)** : pour lancer les builds et le submit depuis le serveur, définissez la variable d’environnement **`EXPO_TOKEN`** (créée dans [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens)).
4. **Google Play** : pour EAS Submit, configurez les credentials une fois avec  
   `eas credentials` (ou ajoutez un **Service Account** Google Play dans le projet EAS). Voir [Expo – Android credentials](https://docs.expo.dev/app-signing/managed-credentials/).

## Côté backend (variables d’environnement)

```bash
# Obligatoire pour build cloud + submit depuis le serveur
EXPO_TOKEN=votre_expo_access_token

# Optionnel : URL de l’API pour les builds (injectée dans l’app) — prod : https://taptapgo.onrender.com
EXPO_PUBLIC_BACKEND_URL=https://taptapgo.onrender.com
TAPTAPGO_PUBLIC_BACKEND_URL=https://taptapgo.onrender.com
```

## Workflow dans l’app SuperAdmin

1. Créer la marque (nom, logo, couleurs, etc.).
2. Cliquer sur **« Build rapid »** (build cloud EAS).
3. Attendre la fin du build (suivre le lien EAS ou le pourcentage dans l’app).
4. Quand le statut est **Succès**, le bouton **« Soumèt Play Store »** apparaît.
5. Choisir le **track** (internal / alpha / beta / production) et cliquer sur **« Soumèt Play Store »**.
6. La soumission est envoyée à Google Play via EAS Submit.

## Tracks Google Play

- **internal** : test interne (idéal pour vérifier avant publication).
- **alpha** / **beta** : test fermé ou ouvert.
- **production** : mise en production sur le Play Store.

## Migration base de données

Si la table `builds` existait déjà, exécuter la migration pour EAS Submit :

```sql
-- Fichier: backend/migrations/add_eas_submit_columns.sql
ALTER TABLE builds ADD COLUMN IF NOT EXISTS eas_build_id TEXT;
ALTER TABLE builds ADD COLUMN IF NOT EXISTS submit_status TEXT;
ALTER TABLE builds ADD COLUMN IF NOT EXISTS submit_track TEXT;
```

## Dépannage

- **« eas/npx pa jwenn nan PATH »** : installer EAS CLI (`npm install -g eas-cli`) ou s’assurer que `npx` est disponible.
- **« Se build cloud (EAS) ki ka soumèt »** : seuls les builds lancés via **« Build rapid »** (cloud) peuvent être soumis ; les builds locaux n’ont pas d’`eas_build_id`.
- **EAS Submit échoue** : vérifier `eas credentials` pour Android et que le compte de service Google Play a les droits nécessaires.
