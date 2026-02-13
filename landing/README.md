# Landing Page TapTapGo

## Tès lokal

1. **Backend** (obligatwa)  
   Depuis le dossier `backend` : `.\start.ps1`  
   L’API doit tourner sur **http://localhost:8000**.

2. **Migration base de données**  
   Exécuter dans Supabase (SQL Editor) :  
   `backend/migrations/add_landing_content.sql`

3. **Servir la landing**  
   Depuis la racine du projet :
   ```powershell
   npx serve landing -p 3000
   ```
   La landing sera disponible sur **http://localhost:3000**.

4. **SuperAdmin**  
   Lancer le frontend (Expo web) : `cd frontend` puis `yarn start -c`.  
   Se connecter en SuperAdmin, aller dans **Gere Sit**, modifier les textes, cliquer **Anregistre**, puis ouvrir **http://localhost:3000** pour voir les changements.

## Gestion du contenu

Depuis le SuperAdmin, l’onglet **Gere Sit** permet de :
- **Modifye** : modifier tout le texte de la landing
- **Korekte** : corriger les textes
- **Reyinite** : remettre les textes par défaut (supprimer les modifications)
