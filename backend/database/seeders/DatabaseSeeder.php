<?php

namespace Database\Seeders;

use App\Models\Classe;
use App\Models\Domaine;
use App\Models\Ec;
use App\Models\Enseignant;
use App\Models\Etudiant;
use App\Models\Inscription;
use App\Models\Mention;
use App\Models\Note;
use App\Models\Specialite;
use App\Models\Ue;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;

/**
 * Données de démonstration, lues dans donnees_demo.json (le même fichier sert à la démo en ligne).
 *
 *  - Programme de la L2 IAGE : structure des UE/EC reprise des bulletins S3/S4 de l'ISI
 *  - Programme de la L3 IAGE : S5 et S6
 *  - Étudiants et notes : fictifs
 *
 * Comptes : admin@ecole.sn / admin123 · moussa.diop@ecole.sn / passer123 · fatou.sow@ecole.sn / passer123
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $donnees = json_decode(file_get_contents(__DIR__.'/donnees_demo.json'), true);

        // Ordre imposé par les clés étrangères
        $tables = [
            'domaines' => Domaine::class,
            'mentions' => Mention::class,
            'specialites' => Specialite::class,
            'classes' => Classe::class,
            'users' => User::class,          // le mot de passe est haché automatiquement (cast « hashed »)
            'enseignants' => Enseignant::class,
            'etudiants' => Etudiant::class,
            'inscriptions' => Inscription::class,
            'ues' => Ue::class,
            'ecs' => Ec::class,
            'notes' => Note::class,
        ];

        Model::unguarded(function () use ($donnees, $tables) {
            foreach ($tables as $cle => $modele) {
                foreach ($donnees[$cle] as $ligne) {
                    $modele::create($ligne);
                }
            }
        });
    }
}
