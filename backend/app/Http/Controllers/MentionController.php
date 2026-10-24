<?php

namespace App\Http\Controllers;

use App\Models\Mention;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MentionController extends Controller
{
    public function index()
    {
        return Mention::with('domaine')->orderBy('libelle')->get();
    }

    public function store(Request $request)
    {
        $m = Mention::create($this->valider($request));

        return response()->json($m->load('domaine'), 201);
    }

    public function update(Request $request, Mention $mention)
    {
        $mention->update($this->valider($request, $mention));

        return $mention->load('domaine');
    }

    public function destroy(Mention $mention)
    {
        if ($mention->specialites()->exists()) {
            return response()->json(['message' => 'Supprimez d\'abord les spécialités de cette mention.'], 422);
        }
        $mention->delete();

        return response()->json(['message' => 'Mention supprimée.']);
    }

    private function valider(Request $request, ?Mention $mention = null): array
    {
        return $request->validate([
            'domaine_id' => 'required|exists:domaines,id',
            'libelle' => [
                'required', 'string', 'max:150',
                Rule::unique('mentions')->where('domaine_id', $request->input('domaine_id'))->ignore($mention?->id),
            ],
        ], ['libelle.unique' => 'Cette mention existe déjà dans ce domaine.']);
    }
}
