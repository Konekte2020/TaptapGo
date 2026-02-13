# Mise en production – TapTapGo

Checklist et étapes pour déployer le projet en ligne (backend, base de données, app mobile).

---

## 1. Backend (API)

### Variables d’environnement obligatoires

Créer un fichier `.env` (ou configurer les variables sur l’hébergeur) à partir de `backend/.env.example` :

| Variable        | Description                          |
|----------------|--------------------------------------|
| `SUPABASE_URL` | URL du projet Supabase (prod)        |
| `SUPABASE_KEY` | Clé anon (ou service_role) Supabase  |
| `JWT_SECRET`   | Clé secrète longue et aléatoire      |

Optionnel : `CORS_ORIGINS` (en prod, liste d’URLs séparées par des virgules), `EXPO_TOKEN`, `TAPTAPGO_PUBLIC_BACKEND_URL`. Voir `backend/.env.example`.

### Démarrer en production

Sans Docker :

```bash
cd backend
uvicorn server:app --host 0.0.0.0 --port 8000
```

Avec Docker (depuis la racine du repo) :

```bash
docker build -t taptapgo-backend ./backend
docker run -p 8000:8000 --env-file backend/.env taptapgo-backend
```

### Health check

- **URL :** `GET /api/health`
- **Réponse :** `{"status": "ok"}`
- À utiliser pour les load balancers et la surveillance (uptime).

### Hébergeurs possibles

- **Railway / Render / Fly.io** : déployer le dossier `backend` (ou l’image Docker), définir les variables d’env, exposer le port 8000.
- S’assurer que l’API est servie en **HTTPS** (généralement fourni par la plateforme).

---

## 2. Base de données (Supabase)

1. Créer un projet Supabase (prod) sur [supabase.com](https://supabase.com).
2. Dans le SQL Editor, exécuter dans l’ordre :
   - `database_setup.sql` (racine du projet)
   - Tous les scripts dans `backend/migrations/` (ex. `add_eas_submit_columns.sql`, `add_pricing_moto_car_columns.sql`).
3. Récupérer l’URL et la clé anon du projet et les mettre dans `SUPABASE_URL` et `SUPABASE_KEY` du backend.

---

## 3. Frontend / EAS (app mobile)

### Variables pour les builds

Dans **EAS** (expo.dev), configurer les **Secrets** pour les profils `preview` et `production` (ou définir les env dans `eas.json` sans committer de secrets) :

| Variable                         | Description |
|---------------------------------|-------------|
| `EXPO_PUBLIC_BACKEND_URL`       | URL publique HTTPS de l’API (ex. `https://api.taptapgo.com`) |
| `EXPO_PUBLIC_BACKEND_URL_ANDROID` | Souvent la même que ci‑dessus |
| `EXPO_PUBLIC_MAPBOX_TOKEN`      | Token Mapbox pour les cartes |
| `EXPO_PUBLIC_BRAND_ID`          | (Optionnel) ID marque white-label |
| `EXPO_PUBLIC_BRAND_NAME`        | (Optionnel) Nom de la marque |

Ne pas laisser `REPLACE_ME` dans les builds de production. Définir les valeurs soit dans **EAS Secrets** (recommandé), soit en remplaçant dans `eas.json` avant de build (sans committer de secrets).

Exemple avec EAS Secrets (depuis le dossier `frontend`) :

```bash
eas secret:create --name EXPO_PUBLIC_BACKEND_URL --value "https://api.votre-domaine.com" --scope project
eas secret:create --name EXPO_PUBLIC_BACKEND_URL_ANDROID --value "https://api.votre-domaine.com" --scope project
eas secret:create --name EXPO_PUBLIC_MAPBOX_TOKEN --value "pk.xxx" --scope project
```

Voir `frontend/.env.example` pour la liste des variables.

### Lancer un build production

```bash
cd frontend
eas build --profile production --platform android
```

---

## 4. Build EAS depuis le superadmin

Pour que les boutons « Build rapid » et « Soumèt Play Store » fonctionnent depuis le serveur :

1. Créer un token sur [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens).
2. Définir **`EXPO_TOKEN`** dans l’environnement du backend (fichier `.env` ou config de l’hébergeur).
3. Configurer les credentials Android (et iOS si besoin) avec `eas credentials` ou un Service Account Google Play lié au projet EAS.

Voir `docs/EAS_BUILD_ET_SUBMIT.md` pour le détail.

---

## 5. CORS en production

Sur le serveur backend, définir par exemple :

```env
CORS_ORIGINS=https://votre-app.com,https://admin.votre-app.com,https://votre-app.expo.dev
```

Adapter aux domaines réels de l’app web et des previews Expo. Ne pas utiliser `*` en production.

---

## 6. Récap checklist

| Étape | Action |
|-------|--------|
| Backend | Héberger l’API (Railway, Render, Docker, etc.) avec HTTPS |
| Secrets | Toutes les variables dans .env ou config hébergeur, jamais en dur |
| CORS | Définir `CORS_ORIGINS` avec les domaines réels |
| Health | Vérifier que `GET /api/health` répond `{"status":"ok"}` |
| Base de données | Appliquer `database_setup.sql` + migrations sur Supabase prod |
| EAS / app | Remplacer tous les `REPLACE_ME` par de vraies valeurs ou EAS Secrets |
| Build depuis le serveur | Configurer `EXPO_TOKEN` côté backend |
| Stores | Comptes développeur + fiches store (description, captures, politique de confidentialité) |

---

## 7. Fichiers utiles

- `backend/.env.example` – Modèle des variables backend
- `frontend/.env.example` – Modèle des variables frontend / EAS
- `backend/Dockerfile` – Image Docker du backend
- `docs/EAS_BUILD_ET_SUBMIT.md` – Build cloud et soumission Play Store
