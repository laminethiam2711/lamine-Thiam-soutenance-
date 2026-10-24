<?php

namespace App\Http\Controllers;

use App\Models\Classe;
use App\Models\Ec;
use App\Models\Enseignant;
use App\Models\Etudiant;
use App\Models\Note;
use App\Models\Ue;
use App\Services\CalculMoyenneService;

/** Tableau de bord de l'administrateur */
class DashboardController extends Controller
{
    public function index(CalculMoyenneService $service)
    {
        $parClasse = [];
        $appreciations = ['Très bien' => 0, 'Bien' => 0, 'Assez bien' => 0, 'Passable' => 0, 'Insuffisant' => 0, 'Médiocre' => 0];
        $meilleurs = [];
        $admis = 0;
        $evalues = 0;

        foreach (Classe::orderBy('niveau')->get() as $classe) {
            $resultats = collect($service->classement($classe));
            $termines = $resultats->whereNotNull('moyenne');
            $nbAdmis = $termines->filter(fn ($r) => str_starts_with($r['decision'], 'Admis'))->count();

            $parClasse[] = [
                'classe' => $classe->libelle,
                'effectif' => $resultats->count(),
                'moyenne' => $termines->count() ? CalculMoyenneService::tronquer($termines->avg('moyenne')) : null,
                'taux_reussite' => $termines->count() ? (int) round($nbAdmis / $termines->count() * 100) : null,
            ];

            foreach ($termines as $r) {
                $appreciations[$r['appreciation']]++;
                $meilleurs[] = $r + ['classe' => $classe->libelle];
            }
            $admis += $nbAdmis;
            $evalues += $termines->count();
        }

        usort($meilleurs, fn ($a, $b) => $b['moyenne'] <=> $a['moyenne']);

        return [
            'totaux' => [
                'etudiants' => Etudiant::count(),
                'enseignants' => Enseignant::count(),
                'classes' => Classe::count(),
                'ues' => Ue::count(),
                'ecs' => Ec::count(),
                'notes' => Note::count(),
            ],
            'taux_reussite' => $evalues ? (int) round($admis / $evalues * 100) : null,
            'par_classe' => $parClasse,
            'appreciations' => $appreciations,
            'meilleurs' => array_slice($meilleurs, 0, 5),
        ];
    }
}
