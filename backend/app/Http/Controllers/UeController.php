<?php

namespace App\Http\Controllers;

use App\Models\Classe;
use App\Models\Ue;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Unités d'Enseignement (UE) d'une classe, avec leurs EC */
class UeController extends Controller
{
    public function index(Request $request)
    {
        return Ue::with(['classe', 'ecs.enseignant.user'])
            ->when($request->filled('classe_id'), fn ($q) => $q->where('classe_id', $request->classe_id))
            ->when($request->filled('semestre'), fn ($q) => $q->where('semestre', $request->semestre))
            ->orderBy('classe_id')->orderBy('semestre')->orderBy('code')
            ->get();
    }

    public function store(Request $request)
    {
        $ue = Ue::create($this->valider($request));

        return response()->json($ue->load(['classe', 'ecs.enseignant.user']), 201);
    }

    public function update(Request $request, Ue $ue)
    {
        $ue->update($this->valider($request, $ue));

        return $ue->load(['classe', 'ecs.enseignant.user']);
    }

    public function destroy(Ue $ue)
    {
        $ue->delete(); // supprime aussi ses EC et leurs notes (cascade)

        return response()->json(['message' => 'UE supprimée.']);
    }

    private function valider(Request $request, ?Ue $ue = null): array
    {
        $donnees = $request->validate([
            'classe_id' => 'required|exists:classes,id',
            'code' => [
                'required', 'string', 'max:20',
                Rule::unique('ues')->where('classe_id', $request->input('classe_id'))->ignore($ue?->id),
            ],
            'libelle' => 'required|string|max:200',
            'credits' => 'required|integer|min:1|max:30',
            'semestre' => 'required|integer|min:1|max:6',
        ], ['code.unique' => 'Ce code d\'UE existe déjà dans cette classe.']);

        // Le semestre doit appartenir à l'année de la classe (ex. S5 ou S6 pour une L3)
        $classe = Classe::find($donnees['classe_id']);
        if (! in_array((int) $donnees['semestre'], $classe->semestres, true)) {
            abort(response()->json([
                'message' => "Le semestre doit être S{$classe->semestres[0]} ou S{$classe->semestres[1]} pour cette classe.",
                'errors' => ['semestre' => ['Semestre incompatible avec le niveau de la classe.']],
            ], 422));
        }

        return $donnees;
    }
}
