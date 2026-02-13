# Backend TapTapGo

## Démarrer le serveur (une fois pour toutes)

### Option 1 : Scripts fournis (recommandé)

Depuis le dossier `backend` :

- **PowerShell :** `.\start.ps1`
- **Invite de commandes :** `start.bat`

Les scripts utilisent automatiquement `py`, `python` ou `python3` selon ce qui est installé.

### Option 2 : Ligne de commande

```bash
cd backend
py -m uvicorn server:app --reload --port 8000
```

Si `py` ne fonctionne pas, essayez :

```bash
python -m uvicorn server:app --reload --port 8000
```

---

## Erreur « python n'est pas reconnu » (Windows)

Cela signifie que Python n’est pas dans le PATH. À faire **une seule fois** :

1. **Vérifier si Python est installé**  
   Ouvrez une **nouvelle** invite de commandes ou PowerShell et tapez :  
   `py --version` ou `python --version`.

2. **Si aucune commande ne fonctionne : installer Python**
   - Allez sur [python.org/downloads](https://www.python.org/downloads/)
   - Téléchargez la dernière version pour Windows
   - **Important :** lors de l’installation, cochez **« Add python.exe to PATH »**
   - Redémarrez le terminal (ou Cursor) après l’installation

3. **Si Python est déjà installé mais pas reconnu**
   - Cherchez où il est installé (souvent `C:\Users\VotreNom\AppData\Local\Programs\Python\Python3xx\` ou `C:\Python3xx\`)
   - Ajoutez ce dossier (et le sous-dossier `Scripts`) au **PATH** :
     - Panneau de configuration → Système → Paramètres système avancés → Variables d’environnement
     - Dans « Variables système », éditez `Path` et ajoutez le chemin vers Python et `Scripts`

Après avoir corrigé le PATH, utilisez `.\start.ps1` ou `start.bat` depuis le dossier `backend`.

## Dépendances

```bash
pip install -r requirements.txt
# ou avec py :
py -m pip install -r requirements.txt
```

## Configuration (.env)

1. Copier `backend/.env.example` en `backend/.env`.
2. Remplir au minimum : `SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET`.

Sans fichier `.env` valide, le serveur refusera de démarrer. Voir `docs/DEPLOY.md` pour la mise en production.

## Production

- **Health check :** `GET /api/health` → `{"status": "ok"}`.
- **Démarrage :** `uvicorn server:app --host 0.0.0.0 --port 8000`.
- **Docker :** `docker build -t taptapgo-backend .` puis `docker run -p 8000:8000 --env-file .env taptapgo-backend`.
