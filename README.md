# Système de gestion des notes et résultats académiques

Mémoire L3 IAGE — Mohamed Lamine Thiam — Année 2025-2026

Application web composée de deux projets :

| Dossier     | Rôle                                   | Technologie                  |
|-------------|----------------------------------------|------------------------------|
| `backend/`  | API REST, base de données, calculs     | Laravel 12 + Sanctum + MySQL |
| `frontend/` | Interface utilisateur (thème bleu foncé) | Angular 18                  |

---

## 1. Installation

### Prérequis
- PHP 8.2 ou plus, Composer, MySQL (XAMPP / WAMP / Laragon)
- Node.js 18 ou plus, npm

### Back-end (API Laravel)

```bash
cd backend
composer install
cp .env.example .env          # sous Windows : copy .env.example .env
php artisan key:generate
```

Créer la base `gestion_notes` dans phpMyAdmin, vérifier `DB_USERNAME` / `DB_PASSWORD` dans `.env`, puis :

```bash
php artisan migrate --seed    # crée les tables + les données de démonstration
php artisan serve             # API sur http://localhost:8000
```

### Front-end (Angular)

```bash
cd frontend
npm install
ng serve                      # ou : npx ng serve
```

Ouvrir **http://localhost:4200**.
L'adresse de l'API se règle dans `frontend/src/environments/environment.ts`.

### Comptes de démonstration

| Rôle           | Email                  | Mot de passe |
|----------------|------------------------|--------------|
| Administrateur | admin@ecole.sn         | admin123     |
| Enseignant     | moussa.diop@ecole.sn   | passer123    |
| Étudiant (L3)  | fatou.sow@ecole.sn     | passer123    |
| Étudiante (L2) | astou.diagne@ecole.sn  | passer123    |

Tous les enseignants et étudiants du seeder ont le mot de passe `passer123`
(ex. `awa.ndiaye@ecole.sn`, `ibrahima.ba@ecole.sn`). Sur la page de connexion,
les boutons « Comptes de démonstration » remplissent les champs.

---

## 2. Fonctionnalités par acteur

**Administrateur**
- Tableau de bord : effectifs, taux d'admission, résultats par classe, répartition des appréciations, meilleurs étudiants
- Formations : domaine › mention › spécialité (ex. Sciences et Technologies › Informatique › IAGE)
- Classes : spécialité, grade, niveau (L1 = S1/S2, L2 = S3/S4, L3 = S5/S6), année académique
- UE et EC : unités d'enseignement (code, crédits, semestre) et leurs éléments constitutifs (coefficient, enseignant)
- Étudiants (identifiant, sexe, date et lieu de naissance, inscription dans une classe) et enseignants
- Résultats par semestre ou pour l'année, **délibération** (enregistre le résultat annuel), bulletin de chaque étudiant

**Enseignant**
- Liste de ses EC avec l'avancement de la saisie
- Saisie **MCC / Examen / Rattrapage** pour toute la classe, moyenne EC recalculée en direct, contrôle 0 – 20

**Étudiant**
- Accueil : moyenne et crédits de chaque semestre, résultat de l'année
- Bulletin au format ISI : semestre, 2e semestre avec rappel du 1er et résultat annuel, relevé annuel

---

## 3. Règles de calcul (bulletin ISI, système LMD)

Toutes les règles sont dans **`backend/app/Services/CalculMoyenneService.php`**.

| Élément             | Règle                                                                     |
|---------------------|---------------------------------------------------------------------------|
| Moyenne EC          | MCC × 40 % + Examen × 60 % (2 décimales)                                  |
| Rattrapage          | remplace la note d'examen si elle est meilleure                           |
| Moyenne Coef        | Moyenne EC × coefficient EC                                               |
| Moyenne UE          | Σ Moyenne Coef / Σ coefficients de l'UE (**arrondie à 3 décimales**)      |
| UE validée          | Moyenne UE ≥ 10 → l'UE donne **tous** ses crédits (compensation entre EC) |
| Moyenne du semestre | Σ (Moyenne UE × Σ coef UE) / Σ coefficients (**tronquée à 2 décimales**)  |
| Moyenne générale    | (Moyenne S1 + Moyenne S2) / 2 (tronquée)                                  |
| Crédits             | 30 par semestre, 60 par an                                                |
| Décision semestre   | « Travail » + appréciation de la moyenne, ex. « Travail Passable »        |
| Résultat annuel     | 60 crédits → « Admis(e) en classe supérieure » (L3 : « Licence validée »), sinon « Ajourné(e) » |

Appréciation : < 8 Médiocre · 8–10 Insuffisant · 10–12 Passable · 12–14 Assez bien · 14–16 Bien · ≥ 16 Très bien.

**Vérification avec un vrai bulletin** (L2 IAGE, S3) : MOR1305 = 74,00 / 6 = 12,333 ;
semestre = 372,798 / 32 = 11,6499 → **11,64** (comme sur le bulletin papier). S4 = **11,06**,
moyenne générale = **11,35**, 60/60 crédits. Ces chiffres sont vérifiés par le test
`tests/Unit/CalculMoyenneServiceTest.php` :

```bash
php artisan test --filter=CalculMoyenneServiceTest
```

---

## 4. Modèle de données

```
domaines     (id, libelle)
mentions     (id, domaine_id, libelle)
specialites  (id, mention_id, code, libelle)
classes      (id, specialite_id, libelle, grade, niveau, annee_academique)

ues          (id, classe_id, code, libelle, credits, semestre)
ecs          (id, ue_id, libelle, coefficient, enseignant_id)

users        (id, prenom, nom, email, telephone, role[admin|enseignant|etudiant], password)
enseignants  (id, user_id, matricule, specialite)
etudiants    (id, user_id, matricule, sexe, date_naissance, lieu_naissance)
inscriptions (id, etudiant_id, classe_id)                 -- une par année
notes        (id, inscription_id, ec_id, mcc, examen, rattrapage)
resultats_annuels (id, inscription_id, moyenne_s1, moyenne_s2, moyenne_generale,
                   credits_s1, credits_s2, credits_total, decision, delibere_le)
```

Les données de démonstration sont dans `backend/database/seeders/donnees_demo.json`
(programme de la L2 IAGE repris des bulletins S3/S4, étudiants et notes fictifs).

---

## 5. Routes de l'API (préfixe `/api`)

| Méthode  | Route                                        | Accès      | Description                          |
|----------|----------------------------------------------|------------|--------------------------------------|
| POST     | /login                                       | public     | Connexion, renvoie un jeton          |
| GET/POST/PUT | /me · /logout · /mot-de-passe            | connecté   | Profil, déconnexion, mot de passe    |
| GET      | /dashboard                                   | admin      | Statistiques                         |
| CRUD     | /domaines, /mentions, /specialites, /classes | admin      | Offre de formation                   |
| CRUD     | /ues, /ecs                                   | admin      | Programme                            |
| CRUD     | /etudiants, /enseignants                     | admin      | Personnes                            |
| GET      | /classes/{id}/resultats?semestre=            | admin      | PV d'un semestre ou de l'année       |
| POST     | /classes/{id}/deliberation                   | admin      | Enregistre les résultats annuels     |
| GET      | /etudiants/{id}/bulletin?semestre=           | admin      | Bulletin d'un étudiant               |
| GET      | /enseignant/ecs                              | enseignant | Ses EC                               |
| GET/POST | /enseignant/ecs/{id}/notes                   | enseignant | Lire / enregistrer MCC, examen, rattrapage |
| GET      | /etudiant/bulletin?semestre= · /etudiant/resume | étudiant | Son bulletin et son résumé          |

---

## 6. Organisation du code

```
backend/
  app/Models/             Domaine, Mention, Specialite, Classe, Ue, Ec, Enseignant,
                          Etudiant, Inscription, Note, ResultatAnnuel, User
  app/Services/           CalculMoyenneService (règles du bulletin)
  app/Http/Controllers/   Auth, Domaine, Mention, Specialite, Classe, Ue, Ec, Etudiant,
                          Enseignant, EspaceEnseignant, EspaceEtudiant, Dashboard
  tests/Unit/             CalculMoyenneServiceTest (vérification avec un vrai bulletin)

frontend/src/app/
  shared/bulletin.component.*   bulletin au format ISI
  pages/admin/                  tableau de bord, formations, classes, UE et EC,
                                étudiants, enseignants, résultats, bulletin
  pages/enseignant/             mes enseignements, saisie des notes
  pages/etudiant/               accueil, mon bulletin
```

---

## 7. Problèmes fréquents

- **« Impossible de joindre l'API »** : lancer `php artisan serve` dans `backend/`.
- **Erreur de connexion MySQL** : vérifier que MySQL est démarré et que la base `gestion_notes` existe.
- **Repartir de zéro** (obligatoire après cette mise à jour) : `php artisan migrate:fresh --seed`.
- **Changer le nom, le sigle ou le signataire des bulletins** : `etablissement`, `sigle`, `signataire` dans `frontend/src/environments/environment.ts`.

---

## Application mobile Android

Le frontend est aussi emballé en application Android avec **Capacitor** (dossier `frontend/android`).
L'APK utilise la version de démonstration : les données sont intégrées et l'application fonctionne sans serveur.

- **Télécharger l'APK :** onglet *Releases* du dépôt → fichier `GestNotes.apk`.
  Il est reconstruit automatiquement par GitHub Actions (`.github/workflows/apk-android.yml`) à chaque modification du frontend.
- **Le reconstruire soi-même** (Android Studio ou SDK Android requis) :

```bash
cd frontend
npm install
npx ng build --configuration demo
npx cap sync android
cd android && ./gradlew assembleDebug   # APK : app/build/outputs/apk/debug/app-debug.apk
```
