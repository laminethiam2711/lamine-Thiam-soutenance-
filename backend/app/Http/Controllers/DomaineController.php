<?php

namespace App\Http\Controllers;

use App\Models\Domaine;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DomaineController extends Controller
{
    public function index()
    {
        return Domaine::with('mentions.specialites')->orderBy('libelle')->get();
    }

    public function store(Request $request)
    {
        $d = Domaine::create($request->validate([
            'libelle' => 'required|string|max:150|unique:domaines,libelle',
        ], ['libelle.unique' => 'Ce domaine existe déjà.']));

        return response()->json($d, 201);
    }

    public function update(Request $request, Domaine $domaine)
    {
        $domaine->update($request->validate([
            'libelle' => ['required', 'string', 'max:150', Rule::unique('domaines')->ignore($domaine->id)],
        ], ['libelle.unique' => 'Ce domaine existe déjà.']));

        return $domaine;
    }

    public function destroy(Domaine $domaine)
    {
        if ($domaine->mentions()->exists()) {
            return response()->json(['message' => 'Supprimez d\'abord les mentions de ce domaine.'], 422);
        }
        $domaine->delete();

        return response()->json(['message' => 'Domaine supprimé.']);
    }
}
