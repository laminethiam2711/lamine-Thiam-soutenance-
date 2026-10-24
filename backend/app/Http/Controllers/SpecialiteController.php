<?php

namespace App\Http\Controllers;

use App\Models\Specialite;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SpecialiteController extends Controller
{
    public function index()
    {
        return Specialite::with('mention.domaine')->withCount('classes')->orderBy('code')->get();
    }

    public function store(Request $request)
    {
        $s = Specialite::create($this->valider($request));

        return response()->json($s->load('mention.domaine'), 201);
    }

    public function update(Request $request, Specialite $specialite)
    {
        $specialite->update($this->valider($request, $specialite));

        return $specialite->load('mention.domaine');
    }

    public function destroy(Specialite $specialite)
    {
        if ($specialite->classes()->exists()) {
            return response()->json(['message' => 'Impossible de supprimer une spécialité qui a des classes.'], 422);
        }
        $specialite->delete();

        return response()->json(['message' => 'Spécialité supprimée.']);
    }

    private function valider(Request $request, ?Specialite $specialite = null): array
    {
        return $request->validate([
            'mention_id' => 'required|exists:mentions,id',
            'code' => ['required', 'string', 'max:20', Rule::unique('specialites')->ignore($specialite?->id)],
            'libelle' => 'required|string|max:200',
        ], ['code.unique' => 'Ce code de spécialité existe déjà.']);
    }
}
