<?php

namespace App\Http\Controllers;

use App\Models\Ec;
use App\Models\Note;
use App\Services\CalculMoyenneService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Espace enseignant : ses EC et la saisie des notes (MCC, examen, rattrapage).
 * Un enseignant ne peut accéder qu'aux EC qui lui sont attribués.
 */
class EspaceEnseignantController extends Controller
{
    public function mesEcs(Request $request)
    {
        $enseignant = $request->user()->enseignant;
        if (! $enseignant) {
            return response()->json([]);
        }

        return $enseignant->ecs()->with('ue.classe')->get()
            ->map(function (Ec $ec) {
                $inscrits = $ec->ue->classe->inscriptions()->count();
                // Une saisie est complète quand chaque étudiant a son MCC et son examen
                $completes = $ec->notes()->whereNotNull('mcc')->whereNotNull('examen')->count();
                $ec->setAttribute('effectif', $inscrits);
                $ec->setAttribute('progression', $inscrits > 0 ? (int) round($completes / $inscrits * 100) : 0);

                return $ec;
            })
            ->sortBy(fn ($ec) => [$ec->ue->classe_id, $ec->ue->semestre, $ec->ue->code])
            ->values();
    }

    /** Étudiants de la classe avec leurs notes dans cet EC */
    public function notesEc(Request $request, Ec $ec)
    {
        $this->verifierProprietaire($request, $ec);
        $ec->load('ue.classe');

        $notes = Note::where('ec_id', $ec->id)->get()->keyBy('inscription_id');

        $lignes = $ec->ue->classe->inscriptions()->with('etudiant.user')->get()
            ->sortBy(fn ($i) => $i->etudiant->user->nom.' '.$i->etudiant->user->prenom)
            ->values()
            ->map(function ($i) use ($notes) {
                $n = $notes->get($i->id);

                return [
                    'inscription_id' => $i->id,
                    'identifiant' => $i->etudiant->matricule,
                    'nom_complet' => $i->etudiant->user->nom_complet,
                    'mcc' => $n?->mcc,
                    'examen' => $n?->examen,
                    'rattrapage' => $n?->rattrapage,
                    'moyenne' => CalculMoyenneService::moyenneEc($n?->mcc, $n?->examen, $n?->rattrapage),
                ];
            });

        return ['ec' => $ec, 'etudiants' => $lignes];
    }

    /** Enregistre les notes de toute la classe. Une case vide efface la note. */
    public function enregistrerNotes(Request $request, Ec $ec)
    {
        $this->verifierProprietaire($request, $ec);

        $d = $request->validate([
            'notes' => 'required|array',
            'notes.*.inscription_id' => 'required|integer|exists:inscriptions,id',
            'notes.*.mcc' => 'nullable|numeric|min:0|max:20',
            'notes.*.examen' => 'nullable|numeric|min:0|max:20',
            'notes.*.rattrapage' => 'nullable|numeric|min:0|max:20',
        ], [
            'notes.*.*.max' => 'Une note ne peut pas dépasser 20.',
            'notes.*.*.min' => 'Une note ne peut pas être négative.',
        ]);

        $inscriptionsDeLaClasse = $ec->ue->classe->inscriptions()->pluck('id')->all();

        DB::transaction(function () use ($d, $ec, $inscriptionsDeLaClasse) {
            foreach ($d['notes'] as $ligne) {
                if (! in_array($ligne['inscription_id'], $inscriptionsDeLaClasse)) {
                    continue; // étudiant d'une autre classe : ignoré
                }
                $valeurs = [
                    'mcc' => $ligne['mcc'] ?? null,
                    'examen' => $ligne['examen'] ?? null,
                    'rattrapage' => $ligne['rattrapage'] ?? null,
                ];
                $cle = ['inscription_id' => $ligne['inscription_id'], 'ec_id' => $ec->id];

                if (collect($valeurs)->every(fn ($v) => $v === null || $v === '')) {
                    Note::where($cle)->delete();
                } else {
                    Note::updateOrCreate($cle, $valeurs);
                }
            }
        });

        return response()->json(['message' => 'Notes enregistrées avec succès.']);
    }

    private function verifierProprietaire(Request $request, Ec $ec): void
    {
        $enseignant = $request->user()->enseignant;
        abort_if(! $enseignant || (int) $ec->enseignant_id !== (int) $enseignant->id, 403,
            'Cet élément constitutif ne vous est pas attribué.');
    }
}
