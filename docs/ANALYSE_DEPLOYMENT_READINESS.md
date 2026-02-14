# Analyse complète – Prêt pour le déploiement

Document généré pour évaluer si le projet **TapTapGo** est prêt pour un déploiement en production (backend, base de données, app mobile, white-label).

---

## 1. Résumé exécutif

| Composant        | Statut       | Commentaire principal                                      |
|------------------|-------------|------------------------------------------------------------|
| Backend (API)    | Prêt*       | Docker + health check + env. À configurer CORS en prod.   |
| Base de données  | Prêt*       | Scripts SQL + migrations. À exécuter sur Supabase prod.   |
| App mobile (EAS) | Prêt*       | eas.json utilise `env: {}` ; configurer EAS Secrets (BACKEND_URL, MAPBOX_TOKEN, etc.). |
| White-label APK  | Blocants    | Voir docs/WHITE_LABEL_BUILD_ANALYSIS.md et correctifs listés. |
| CI/CD            | Absent      | Pas de pipeline GitHub Actions / déploiement auto.        |
| Tests auto       | Absent      | Pas de suite de tests (Jest, pytest, etc.) dans le projet. |

\* Prêt = structure et config présentes ; la mise en production dépend des valeurs réelles (env, CORS, etc.).

---

## 2. Backend (API)

### 2.1 Points positifs

- **Stack** : FastAPI, uvicorn, dépendances dans `backend/requirements.txt`.
- **Variables d’environnement** : `SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET` obligatoires ; le serveur refuse de démarrer si elles manquent.
- **Health check** : `GET /api/health` → `{"status": "ok"}` (utilisable par load balancers / monitoring).
- **Docker** : `backend/Dockerfile` présent avec HEALTHCHECK et `CMD uvicorn`.
- **CORS** : Configurable via `CORS_ORIGINS` (liste d’origines ou `*`).
- **Fichier modèle** : `backend/.env.example` documente toutes les variables.
- **`.env`** : Bien ignoré dans `.gitignore` (pas de secrets commités).

### 2.2 À faire avant déploiement

1. **CORS en production**  
   Ne pas laisser `CORS_ORIGINS=*`. Définir les domaines réels, par exemple :  
   `CORS_ORIGINS=https://taptapgoht.com,https://votre-app.expo.dev` (backend prod : https://taptapgo.onrender.com)

2. **Secrets**  
   S’assurer que sur l’hébergeur (Railway, Render, Fly.io, etc.) :
   - `SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET` sont définis ;
   - Optionnel : `EXPO_TOKEN` (build EAS depuis le serveur), `TAPTAPGO_PUBLIC_BACKEND_URL`, etc. (voir `backend/.env.example`).

3. **HTTPS**  
   L’API doit être servie en HTTPS (généralement assuré par la plateforme).

4. **Multi-instances**  
   Si plusieurs instances backend : le téléchargement d’APK via `apk_path` local peut échouer (fichier présent sur une seule machine). Privilégier l’upload vers Supabase Storage (bucket `builds`) et servir l’APK via URL Supabase.

---

## 3. Base de données (Supabase)

### 3.1 Points positifs

- **Schéma** : `database_setup.sql` à la racine (tables passengers, drivers, admins, etc.).
- **Migrations** : 7 fichiers dans `backend/migrations/` :
  - `add_support_messages.sql`
  - `add_casier_judiciaire.sql`
  - `add_whitelabel_statuses_and_delete.sql`
  - `add_white_label_requests.sql`
  - `add_landing_content.sql`
  - `add_pricing_moto_car_columns.sql`
  - `add_eas_submit_columns.sql`
- **Documentation** : `docs/DEPLOY.md` indique l’ordre d’exécution (database_setup.sql puis migrations).

### 3.2 À faire avant déploiement

1. Créer un projet Supabase **production**.
2. Exécuter dans l’ordre dans le SQL Editor :
   - `database_setup.sql`
   - Chaque script dans `backend/migrations/` (dans un ordre cohérent si des dépendances existent).
3. Créer le bucket **builds** dans Supabase Storage (pour les APK white-label) et le configurer en accès public pour les téléchargements.
4. Récupérer l’URL et la clé anon du projet et les mettre dans `SUPABASE_URL` et `SUPABASE_KEY` du backend.

---

## 4. Frontend / App mobile (Expo – EAS)

### 4.1 Points positifs

- **Expo / EAS** : `frontend/app.json` et `frontend/eas.json` présents.
- **Profils** : `preview` (APK interne) et `production` (AAB store).
- **Variables** : `frontend/.env.example` documente `EXPO_PUBLIC_BACKEND_URL`, `EXPO_PUBLIC_MAPBOX_TOKEN`, etc.
- **Scripts** : `build:android:preview` et `build:android:prod` dans `package.json`.

### 4.2 Blocants / à faire

1. **`eas.json` – valeurs `REPLACE_ME`**  
   Les profils `preview` et `production` ont tous les champs d’env en `REPLACE_ME` :
   - `EXPO_PUBLIC_BACKEND_URL`
   - `EXPO_PUBLIC_BACKEND_URL_ANDROID`
   - `EXPO_PUBLIC_MAPBOX_TOKEN`
   - `EXPO_PUBLIC_BRAND_ID`
   - `EXPO_PUBLIC_BRAND_NAME`  

   **Action** : Soit configurer les **EAS Secrets** (recommandé) :
   ```bash
   cd frontend
   eas secret:create --name EXPO_PUBLIC_BACKEND_URL --value "https://api.votre-domaine.com" --scope project
   eas secret:create --name EXPO_PUBLIC_BACKEND_URL_ANDROID --value "https://api.votre-domaine.com" --scope project
   eas secret:create --name EXPO_PUBLIC_MAPBOX_TOKEN --value "pk.xxx" --scope project
   ```
   Soit remplacer `REPLACE_ME` dans `eas.json` avant le build (sans committer de secrets).

2. **Fallback localhost dans le code**  
   Plusieurs endroits utilisent `http://localhost:8000` en fallback (ex. `frontend/src/services/api.ts`, `frontend/app/superadmin/white-label.tsx`). En production, l’URL doit venir des variables d’env (EAS / .env) pour que l’app pointe vers l’API réelle. Vérifier que les builds prod utilisent bien les secrets EAS.

3. **Mapbox**  
   Obtenir un token Mapbox et le configurer (EAS Secret ou env) pour les cartes.

---

## 5. White-label (génération APK)

La doc dédiée est **`docs/WHITE_LABEL_BUILD_ANALYSIS.md`**. Résumé des points bloquants ou à corriger :

| Problème | Composant | Action |
|----------|-----------|--------|
| `createdBrandName` non défini en édition / après refresh | Frontend (white-label) | Définir `createdBrandName` dans `handleEditBrand` ; si une seule marque a un logo, la présélectionner au chargement. |
| Splash screen pointe vers `./assets/images/logo.png` alors que le build met le logo dans `./assets/logo.png` | Build service | Mettre à jour la config splash dans `app.json` lors de la personnalisation. |
| Package Android peut être dupliqué (ex. deux marques → même `com.taptapgo.taptapgo`) | Build service | Utiliser un identifiant unique, ex. `com.taptapgo.{slug}_{short_id}` (short_id = 6 premiers caractères du brand_id). |
| Build local : chemin court Windows (`C:\tb`) | Prérequis | Créer `C:\tb` si besoin ; ANDROID_HOME, Node 18+, Java 11+, npm. |
| Build cloud | Backend | Définir `EXPO_TOKEN` dans `.env` pour « Build rapid » et « Soumèt Play Store ». |
| Bucket Supabase | Supabase | Créer le bucket `builds` et le rendre public pour les téléchargements. |
| APK en `local_only` : téléchargement via chemin local | Backend | En multi-instances, privilégier l’upload Supabase et servir l’APK via URL Supabase. |

Checklist avant un build white-label (extrait de la doc) :

- [ ] Marque créée avec logo et couleurs  
- [ ] `ANDROID_HOME` ou `ANDROID_SDK_ROOT` configuré (build local)  
- [ ] Node.js 18+ et npm  
- [ ] Java 11+ (Gradle)  
- [ ] `C:\tb` existe (Windows, build local)  
- [ ] Pas de build déjà en cours  
- [ ] Pour build cloud : `EXPO_TOKEN` dans `.env`  

---

## 6. CI/CD et tests

### 6.1 CI/CD

- Aucun pipeline détecté (pas de `.github/workflows` ou équivalent).
- Déploiement décrit manuellement dans `docs/DEPLOY.md` (Docker, EAS build, etc.).

**Recommandation** : Pour un déploiement plus robuste, ajouter au moins :
- Un workflow pour build + push de l’image Docker du backend (ou déploiement sur Railway/Render).
- Optionnel : déclencher un build EAS sur tag ou branche (avec secrets EAS).

### 6.2 Tests automatisés

- Aucun script de test dans `frontend/package.json` (pas de Jest, Vitest, etc.).
- Aucun `pytest` ou script de test backend visible dans les commandes du projet.
- Le fichier `test_result.md` décrit un protocole de tests manuels / communication entre agents, pas une suite exécutable.

**Recommandation** : Avant ou après une première mise en production, ajouter au minimum :
- Backend : quelques tests pytest sur les routes critiques (auth, health).
- Frontend : optionnel mais utile pour les écrans clés (login, navigation).

---

## 7. Sécurité et bonnes pratiques

- **Secrets** : Pas de clés en dur ; JWT et Supabase lus depuis l’environnement. `.env` ignoré par Git.
- **CORS** : À restreindre en production (voir §2.2).
- **Mots de passe** : Hash bcrypt côté backend.
- **HTTPS** : À garantir pour l’API et les appels depuis l’app en prod.

---

## 8. Checklist globale avant déploiement

### Backend

- [ ] Variables d’env prod : `SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET`
- [ ] `CORS_ORIGINS` défini avec les domaines réels (pas `*`)
- [ ] API déployée avec HTTPS (Docker ou hébergeur)
- [ ] `GET /api/health` répond `{"status": "ok"}`
- [ ] Optionnel : `EXPO_TOKEN` pour build EAS depuis le serveur

### Base de données

- [ ] Projet Supabase prod créé
- [ ] `database_setup.sql` exécuté
- [ ] Toutes les migrations `backend/migrations/*.sql` exécutées
- [ ] Bucket **builds** créé et configuré (public pour téléchargement)

### App mobile (EAS)

- [ ] EAS Secrets (ou remplacement) pour : `EXPO_PUBLIC_BACKEND_URL`, `EXPO_PUBLIC_BACKEND_URL_ANDROID`, `EXPO_PUBLIC_MAPBOX_TOKEN`
- [ ] Aucun `REPLACE_ME` dans les builds de production
- [ ] Token Mapbox valide pour les cartes

### White-label (si utilisé)

- [ ] Correctifs WHITE_LABEL_BUILD_ANALYSIS appliqués (splash, package name, createdBrandName, etc.)
- [ ] Build local : ANDROID_HOME, Node, Java, `C:\tb` ; ou build cloud : `EXPO_TOKEN`
- [ ] APK servis via Supabase (recommandé en multi-instances)

### Optionnel

- [ ] CI/CD (build + déploiement backend, éventuellement EAS)
- [ ] Tests automatisés (pytest backend minimum)

---

## 9. Verdict

**Le projet n’est pas encore “clé en main” pour un déploiement production sans action.**

- **Backend et base de données** : Prêts une fois l’env et les scripts SQL appliqués, et CORS restreint.
- **App mobile** : Prête après remplacement des `REPLACE_ME` (EAS Secrets ou env) et configuration Mapbox.
- **White-label** : Des correctifs et prérequis sont documentés dans `WHITE_LABEL_BUILD_ANALYSIS.md` ; ils doivent être appliqués pour des builds fiables.
- **CI/CD et tests** : Absents ; recommandés pour une mise en production sereine et des évolutions futures.

En suivant la checklist ci-dessus et les docs (`DEPLOY.md`, `WHITE_LABEL_BUILD_ANALYSIS.md`, `EAS_BUILD_ET_SUBMIT.md`), le déploiement peut être mené à bien de façon contrôlée.
