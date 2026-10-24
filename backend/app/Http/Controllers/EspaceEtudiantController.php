<?php

namespace App\Http\Controllers;

use App\Services\CalculMoyenneService;
use Illuminate\Http\Request;

/** Espace étudiant : consultation de ses propres résultats */
class EspaceEtudiantController extends Controller
{
    public function bulletin(Request $request, CalculMoyenneService $service)
    {
        $inscription = $request->user()->etudiant?->inscription;
        abort_if(! $inscription, 404, 'Aucune inscription trouvée.');

        return $service->bulletin($inscription, $request->integer('semestre') ?: null);
    }

    /** Résumé : les deux semestres et le résultat annuel */
    public function resume(Request $request, CalculMoyenneService $service)
    {
        $inscription = $request->user()->etudiant?->inscription;
        abort_if(! $inscription, 404, 'Aucune inscription trouvée.');

        $b = $service->bulletin($inscription);
        [$s1, $s2] = $b['semestres'];

        $resume = fn ($s) => [
            'semestre' => $s['semestre'],
            'moyenne' => $s['moyenne'],
            'credits_obtenus' => $s['credits_obtenus'],
            'credits_requis' => $s['credits_requis'],
            'decision' => $s['decision'],
            'ues_validees' => count(array_filter($s['ues'], fn ($u) => str_starts_with($u['statut'], 'validee'))),
            'ues_total' => count($s['ues']),
        ];

        return [
            'entete' => $b['entete'],
            'semestre_1' => $resume($s1),
            'semestre_2' => $resume($s2),
            'annuel' => $b['annuel'],
        ];
    }
}
