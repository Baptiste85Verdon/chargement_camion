# Mise en route du poste et des comptes

À faire une fois, avant l'étape 1. Les points 1 et 5 ne peuvent être faits que par vous ; le point 2 peut être confié à Claude Code (étape 0 de `docs/sessions-claude-code.md`).

## 1. Claude Code

Installez Claude Code sur Windows avec l'installateur natif, en suivant la documentation officielle : https://code.claude.com/docs/en/setup. Il n'a pas besoin de Node.js ni des droits administrateur, mais il faut un abonnement payant (Pro, Max, Team ou Enterprise). Vous pouvez aussi passer par l'application de bureau Claude.

## 2. Node.js, Git et GitHub CLI

Ouvrez Claude Code dans le dossier du projet et collez le message de l'étape 0 : il vérifie ce qui est installé et propose les commandes manquantes. Ou faites-le vous-même dans PowerShell :

```
winget install OpenJS.NodeJS.LTS
winget install Git.Git
winget install GitHub.cli
```

Fermez puis rouvrez le terminal (ou Claude Code) après l'installation, pour que les commandes soient trouvées.

## 3. Identité Git et connexion GitHub

**Quand** : pendant l'étape 0, une fois que GitHub CLI est installé, quand Claude Code vous dit que `gh` n'est pas connecté. **Où** : dans une fenêtre PowerShell à part (menu Démarrer → « PowerShell »), pas dans Claude Code : la commande pose des questions et ouvre le navigateur.

```
gh auth login
```

Répondez :

1. *Where do you use GitHub?* → `GitHub.com`
2. *Preferred protocol for Git operations?* → `HTTPS`
3. *Authenticate Git with your GitHub credentials?* → `Yes` (c'est ce qui permettra à Claude Code de pousser)
4. *How would you like to authenticate?* → `Login with a web browser`
5. Copiez le code à 8 caractères affiché, appuyez sur Entrée : le navigateur s'ouvre, collez le code et autorisez.

Vérifiez avec `gh auth status`, puis revenez dans Claude Code et écrivez « c'est fait ». À faire une seule fois par ordinateur.

Claude Code vous demandera aussi votre nom et votre adresse pour `git config user.name` et `user.email` (ce qui signe vos commits). Mettez l'adresse de votre compte GitHub, ou l'adresse masquée `…@users.noreply.github.com` (GitHub → Settings → Emails) si vous ne voulez pas l'exposer dans l'historique.

## 4. Dépôt GitHub

1. Sur GitHub, « New repository » : nom `chargement-camion`, **privé**, **sans** README, sans `.gitignore` et sans licence : le dépôt doit être vide.
2. Copiez son adresse (`https://github.com/<votre-compte>/chargement-camion.git`) et donnez-la à Claude Code à l'étape 0.
3. Après le premier push : Settings → Branches (ou Rules) → règle sur `main` qui exige une demande de fusion et la réussite de l'intégration continue.

## 5. Supabase

1. Créez un compte sur https://supabase.com, puis « New project ». Sur l'écran de création :
   - **Organization** : celle proposée (offre gratuite) ;
   - **GitHub (optional)** : ne connectez **pas** GitHub. Ce lien sert à faire déployer les migrations par Supabase depuis le dépôt ; ici, c'est Claude Code qui les applique, et vous pourrez l'ajouter plus tard ;
   - **Project name** : `chargement-camion` ;
   - **Database password** : cliquez sur « Generate a password » et rangez-le dans votre gestionnaire de mots de passe. Il ne va **pas** dans `.env.local` ;
   - **Region** : Europe ;
   - **Enable Data API** : coché (l'application en a besoin) ;
   - **Automatically expose new tables** : **décoché**, comme Supabase le recommande. Chaque table sera ouverte explicitement par sa migration ;
   - **Enable automatic RLS** : **coché**. Toute nouvelle table est fermée par défaut ; la migration ajoute les autorisations voulues.

   Ces deux derniers choix sont repris dans `CLAUDE.md` (section Supabase) pour que les migrations en tiennent compte.
2. Récupérez deux valeurs, depuis le bouton « Connect » du projet ou dans Project Settings → API Keys :
   - l'**URL du projet**, de la forme `https://xxxxxxxx.supabase.co` ;
   - la **clé publique** (« Publishable key »), qui commence par `sb_publishable_`. Si seul un bouton « Create new API keys » apparaît, cliquez dessus.
3. À la racine du projet, copiez `.env.example` en `.env.local` et remplissez :

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
```

**Ne mettez jamais** la clé secrète (`sb_secret_…`) ni le mot de passe de la base dans une variable dont le nom commence par `VITE_`, ni dans le code : tout ce qui est préfixé `VITE_` est envoyé au navigateur. Les anciennes clés `anon` et `service_role` sont en cours d'abandon chez Supabase : utilisez les nouvelles.

Rappel : un projet gratuit se met en pause après 7 jours sans activité. Il se réactive depuis le tableau de bord, sans perte de données.

## 6. Vérification

Dans Claude Code : « Vérifie que node, git et gh fonctionnent, que gh est connecté et que .env.local contient les deux variables, sans m'afficher leurs valeurs. »
