# Analyse projet TapTapGo – Pages, white-label et déploiement

Ce document répond à trois questions :
1. **Toutes les pages sont-elles connectées ?** (landing, admin, superadmin, souadmin, apps chauffeur/passager)
2. **Une marque créée dans le superadmin est-elle prête à passer en ligne (Play Store) ?**
3. **Peut-on déployer le projet pour tester sur le marché ?**

---

## 1. Connexion des pages et interfaces

### 1.1 Vue d’ensemble du routage

Le **layout racine** (`frontend/app/_layout.tsx`) déclare toutes les zones :

| Route / écran | Rôle | Connecté ? |
|---------------|------|------------|
| `index` | Point d’entrée | ✅ |
| `auth/role-select` | Choix Passager / Chauffeur | ✅ |
| `auth/login` | Connexion (tous types) | ✅ |
| `auth/register-passenger` | Inscription passager | ✅ |
| `auth/register-driver` | Inscription chauffeur | ✅ |
| `auth/otp-verify` | Vérification OTP | ✅ |
| `passenger/*` | App passager (native + web) | ✅ |
| `driver/*` | App chauffeur (native + web) | ✅ |
| `admin/*` | Interface admin (marque / ville) | ✅ |
| `souadmin/*` | Interface souadmin (subadmin) | ✅ |
| `superadmin/*` | Interface superadmin (white-label, landing, etc.) | ✅ |

**Conclusion :** Toutes les zones (landing, admin, superadmin, souadmin, apps natives chauffeur/passager) sont déclarées et accessibles par le routeur.

---

### 1.2 Landing page

- **Où elle est servie :** Par le **backend** (FastAPI) :
  - `GET /landing` → HTML depuis `landing/index.html`
  - Assets : `GET /landing-assets/...` (dossier `landing/`)
- **Sur le frontend (web) :** La page **index** (`app/index.tsx`) affiche la landing **dans une iframe** quand `Platform.OS === 'web'` :
  - `src` de l’iframe = `${API_URL ou localhost:8000}/landing`
- **Contenu dynamique :** L’API expose `GET /api/landing` (sections + footer) et le superadmin peut modifier le contenu via `PUT /api/landing`. Le HTML de la landing utilise ces données (ex. footer, liens store).

**Conclusion :** La landing est bien connectée au backend et intégrée à l’app web (iframe sur la racine). Les liens Play Store / App Store du footer viennent de l’API (configurables par le superadmin).

---

### 1.3 Flux utilisateur : non connecté → rôle → login → dashboard

1. **Utilisateur non connecté (native ou web sans iframe) :**  
   Après chargement, `index` redirige vers `auth/role-select` (avec un délai court).
2. **Role-select :**  
   Propose uniquement **Pasajè** et **Chofè** (liens vers `/auth/login?type=passenger` et `/auth/login?type=driver`).
3. **Login :**  
   - Reçoit `type` en paramètre (passenger, driver, admin, superadmin).  
   - Pour **admin**, le backend peut renvoyer `admin` ou `subadmin` ; le front redirige selon `user_type` :
     - `admin` → `/admin/dashboard`
     - `subadmin` → `/souadmin/dashboard`
     - `superadmin` → `/superadmin/dashboard`
4. **Utilisateur déjà connecté (index) :**  
   Redirection directe selon `user_type` : passenger → `/passenger/home`, driver → `/driver/home` ou `/driver/pending`, admin → `/admin/dashboard`, subadmin → `/souadmin/dashboard`, superadmin → `/superadmin/dashboard`.

**Conclusion :** Admin, superadmin et souadmin sont bien connectés au flux : ils passent par **login** (URL directe avec `?type=admin` ou `?type=superadmin`). Ils ne sont pas proposés sur l’écran **role-select** (seuls Passager et Chauffeur le sont), ce qui est cohérent pour des back-offices.

---

### 1.4 Points d’attention (connexion des pages)

- **Accès admin / superadmin / souadmin :**  
  Il n’y a pas de lien “Espace admin” ou “Connexion admin” sur la landing ou le role-select. Il faut aller directement sur `/auth/login?type=admin` ou `/auth/login?type=superadmin` (ou équivalent selon votre hébergement). Pour un usage interne, c’est souvent suffisant.
- **Nom de route “souadmin” :**  
  La route est `souadmin` (et non `subadmin`) ; le `user_type` en base et dans le JWT reste `subadmin`. C’est volontaire (cohérent dans le code).
- **Web : page d’accueil = landing :**  
  Sur web, la racine affiche la landing en iframe et ne redirige pas vers role-select. Un visiteur qui veut “ouvrir l’app” (passager/chauffeur) doit soit avoir un lien vers `/auth/role-select`, soit le prévoir sur la landing (ex. bouton “Konekte” / “Ouvri app”).

---

## 2. Marque créée dans le superadmin : prête pour le Play Store ?

### 2.1 Parcours prévu dans l’interface superadmin

1. **Créer la marque** (White-label) : nom, logo, couleurs, représentant, etc. → création/mise à jour d’un **admin** avec `brand_name` et assets.
2. **Build rapide (cloud EAS) :**  
   Bouton **« Build rapid »** → le backend appelle EAS avec `EXPO_TOKEN` → build Android (AAB/APK) pour cette marque.
3. **Suivi du build :**  
   L’app affiche le statut (polling) ; à la fin du build réussi, l’APK/AAB est disponible (lien EAS ou stockage).
4. **Soumèt Play Store :**  
   Une fois le build **cloud** terminé avec succès, le bouton **« Soumèt Play Store »** apparaît. Il envoie le build à Google Play (track au choix : internal, alpha, beta, production) via EAS Submit.

Donc **depuis l’interface superadmin**, une nouvelle marque peut être :
- créée,
- construite (Build rapid),
- soumise au Play Store (Soumèt Play Store).

### 2.2 Ce qui est “prêt” vs ce qu’il reste à faire

**Déjà en place (prêt pour “passer en ligne” depuis l’interface) :**

- Création de la marque et build cloud.
- Soumission au Play Store depuis le superadmin (avec `EXPO_TOKEN` et credentials EAS/Google configurés).

**À configurer une fois (pas automatique depuis l’UI) :**

- **EXPO_TOKEN** dans l’environnement du backend (pour lancer build + submit depuis le serveur).
- **Credentials Android / Google Play** : compte développeur Google Play, et soit `eas credentials` soit Service Account lié au projet EAS (voir `docs/EAS_BUILD_ET_SUBMIT.md`).
- **EAS Secrets** pour les builds (ex. `EXPO_PUBLIC_BACKEND_URL`, `EXPO_PUBLIC_MAPBOX_TOKEN`, etc.) – déjà documenté dans `docs/DEPLOY.md` et `docs/ANALYSE_DEPLOYMENT_READINESS.md`.
- **Fiche Play Store** : description, captures d’écran, politique de confidentialité, etc. (à faire par marque ou une fiche générique selon votre stratégie).

**Réponse directe :**  
Oui, **une nouvelle marque peut être rendue “prête à publier sur le Play Store” depuis l’interface superadmin**, à condition que :
- le backend ait `EXPO_TOKEN`,
- les credentials EAS/Google Play soient configurés une fois pour le projet,
- et que vous complétiez la fiche Play Store (et éventuellement un compte développeur dédié par marque si vous voulez des apps séparées).

Les correctifs éventuels (package Android unique par marque, splash, etc.) sont décrits dans `docs/ANALYSE_DEPLOYMENT_READINESS.md` et `docs/WHITE_LABEL_BUILD_ANALYSIS.md` ; ils n’empêchent pas de considérer que le flux “créer marque → build → soumettre” est en place.

---

## 3. Déployer le projet pour tester sur le marché

Oui, le projet est prévu pour être déployé et testé sur le marché. Résumé des pièces et des étapes.

### 3.1 Backend

- Déjà décrit en prod (ex. **https://taptapgo.onrender.com** dans `docs/DEPLOY.md`).
- Variables obligatoires : `SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET`.
- En production : définir **CORS** (`CORS_ORIGINS`) avec les domaines réels (pas `*`).
- Optionnel pour build/submit depuis le serveur : `EXPO_TOKEN`, `TAPTAPGO_PUBLIC_BACKEND_URL`.

### 3.2 Base de données

- Exécuter `database_setup.sql` puis les migrations dans `backend/migrations/` sur un projet Supabase **production**.
- Créer le bucket **builds** (Supabase Storage) pour les APK white-label si vous utilisez les builds depuis le superadmin.

### 3.3 Frontend / Apps mobiles (Expo – EAS)

- Configurer les **EAS Secrets** (BACKEND_URL, MAPBOX_TOKEN, etc.) comme dans `docs/DEPLOY.md`.
- Build production Android :  
  `cd frontend && eas build --profile production --platform android`
- Pour que **Build rapid** et **Soumèt Play Store** fonctionnent depuis le superadmin : `EXPO_TOKEN` dans l’environnement du backend + credentials Android/Google Play (voir `docs/EAS_BUILD_ET_SUBMIT.md`).

### 3.4 Landing en production

- La landing est servie par le même backend (`/landing`). Dès que le backend est déployé (ex. Render), la landing est accessible à `https://votre-api.com/landing`.
- Si l’app web Expo est sur un autre domaine, configurer CORS et, si besoin, l’URL de l’iframe (ou du lien “Ouvri app”) pour pointer vers l’app web.

### 3.5 Récap “déploiement pour tester sur le marché”

| Composant | Statut | Action principale |
|-----------|--------|-------------------|
| Backend | Prêt | Héberger (ex. Render), env + CORS |
| Base de données | Prêt | Supabase prod + migrations + bucket `builds` |
| App mobile (EAS) | Prêt | EAS Secrets + `eas build --profile production --platform android` |
| White-label / Play Store | Prêt* | EXPO_TOKEN + credentials Google Play + fiche store |
| Landing | Prêt | Incluse avec le backend |
| Admin / Superadmin / Souadmin | Prêt | Accessibles via `/auth/login?type=admin` ou `?type=superadmin` |

\* Avec les correctifs éventuels décrits dans les docs d’analyse white-label et déploiement.

---

## 4. Synthèse des réponses

1. **Toutes les pages sont-elles connectées ?**  
   **Oui.** Landing (backend + iframe sur web), admin, superadmin, souadmin et apps chauffeur/passager sont dans le même projet et le routage les relie correctement. Les admins/superadmins/souadmins se connectent via `/auth/login?type=...` (pas affiché sur le role-select).

2. **Une marque créée dans le superadmin est-elle prête à passer en ligne (Play Store) ?**  
   **Oui, sous réserve de configuration.** Création de marque → Build rapid → Soumèt Play Store est prévu depuis l’interface. Il faut une fois : EXPO_TOKEN, credentials EAS/Google Play, et compléter la fiche Play Store (et éventuellement les correctifs décrits dans les docs d’analyse).

3. **Peut-on déployer pour tester sur le marché ?**  
   **Oui.** Backend, base de données, app mobile (EAS), landing et interfaces admin/superadmin/souadmin sont prévus pour le déploiement ; suivre `docs/DEPLOY.md` et les checklists dans `docs/ANALYSE_DEPLOYMENT_READINESS.md` et `docs/EAS_BUILD_ET_SUBMIT.md`.
