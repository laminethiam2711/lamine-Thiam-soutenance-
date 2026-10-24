<?php

namespace App\Http\Controllers;

use App\Models\Ec;
use Illuminate\Http\Request;

/** Éléments Constitutifs (EC) : les matières à l'intérieur d'une UE */
class EcController extends Controller
{
    public function store(Request $request)
    {
        $ec = Ec::create($this->valider($request));

        return response()->json($ec->load('enseignant.user'), 201);
    }

    public function update(Request $request, Ec $ec)
    {
        $ec->update($this->valider($request));

        return $ec->load('enseignant.user');
    }

    public function destroy(Ec $ec)
    {
        $ec->delete();

        return response()->json(['message' => 'EC supprimé.']);
    }

    private function valider(Request $request): array
    {
        return $request->validate([
            'ue_id' => 'required|exists:ues,id',
            'libelle' => 'required|string|max:200',
            'coefficient' => 'required|integer|min:1|max:10',
            'enseignant_id' => 'nullable|exists:enseignants,id',
        ]);
    }
}
