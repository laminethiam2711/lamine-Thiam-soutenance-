<?php

namespace App\Http\Controllers;

use App\Models\Classe;
use App\Models\ResultatAnnuel;
use App\Services\CalculMoyenneService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ClasseController extends Controller
{
    public function index()
    {
        return Classe::with('specialite.mention.domaine')
            ->withCount(['inscriptions', 'ues'])
            ->orderBy('niveau')->orderBy('libelle')
            ->get();
    }

    public function store(Request $request)
    {
        $classe = Classe::create($this->valider($request));

        return response()->json($classe->load('specialite.mention.domaine'), 201);
    }

    public function show(Classe $classe)
    {
        return $classe->load('specialite.mention.domaine')->loadCount(['inscriptions', 'ues']);
    }

    public function update(Request $request, Classe $classe)
    {
        $classe->update($this->valider($request, $classe));

        return $classe->load('specialite.mention.domaine');
    }

    public function destroy(Classe $classe)
    {
        if ($classe->inscriptions()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer une classe qui contient des étudiants.',
            ], 422);
        }
        $classe->delete();

        return response()->json(['message' => 'Classe supprimée.']);
    }

    /**
     * Résultats de la classe : ?semestre=5 pour un semestre, sans paramètre pour l'année.
     */
    public function resultats(Request $request, Classe $classe, CalculMoyenneService $service)
    {
        $semestre = $request->integer('semestre') ?: null;

        return [
            'classe' => $classe->load('specialite'),
            'semestre' => $semestre,
            'resultats' => $service->classement($classe, $semestre),
        ];
    }

    /**
     * Délibération de fin d'année : enregistre le résultat annuel de chaque étudiant.
     */
    public function deliberer(Classe $classe, CalculMoyenneService $service)
    {
        $resultats = $service->classement($classe);

        $enAttente = collect($resultats)->where('moyenne', null)->count();
        if ($enAttente > 0) {
            return response()->json([
                'message' => "Délibération impossible : $enAttente étudiant(s) ont encore des examens à faire.",
            ], 422);
        }

        DB::transaction(function () use ($resultats) {
            foreach ($resultats as $r) {
                ResultatAnnuel::updateOrCreate(
                    ['inscription_id' => $r['inscription_id']],
                    [
                        'moyenne_s1' => $r['moyenne_s1'],
                        'moyenne_s2' => $r['moyenne_s2'],
                        'moyenne_generale' => $r['moyenne'],
                        'credits_s1' => $r['credits_s1'],
                        'credits_s2' => $r['credits_s2'],
                        'credits_total' => $r['credits'],
                        'decision' => $r['decision'],
                        'delibere_le' => now(),
                    ],
                );
            }
        });

        return response()->json(['message' => 'Délibération enregistrée pour '.count($resultats).' étudiant(s).']);
    }

    private function valider(Request $request, ?Classe $classe = null): array
    {
        return $request->validate([
            'specialite_id' => 'required|exists:specialites,id',
            'libelle' => [
                'required', 'string', 'max:100',
                Rule::unique('classes')
                    ->where('annee_academique', $request->input('annee_academique'))
                    ->ignore($classe?->id),
            ],
            'grade' => 'required|in:Licence,Master',
            'niveau' => 'required|integer|min:1|max:3',
            'annee_academique' => ['required', 'string', 'regex:/^\d{4}-\d{4}$/'],
        ], [
            'libelle.unique' => 'Cette classe existe déjà pour cette année académique.',
            'annee_academique.regex' => "L'année académique doit avoir le format 2025-2026.",
        ]);
    }
}
