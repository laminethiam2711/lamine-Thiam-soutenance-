<?php

namespace App\Http\Controllers;

use App\Models\Enseignant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Gestion des enseignants par l'administrateur.
 */
class EnseignantController extends Controller
{
    public const MOT_DE_PASSE_PAR_DEFAUT = 'passer123';

    public function index()
    {
        return Enseignant::with(['user', 'ecs.ue.classe'])->orderBy('matricule')->get();
    }

    public function store(Request $request)
    {
        $donnees = $this->valider($request);

        $enseignant = DB::transaction(function () use ($donnees) {
            $user = User::create([
                'prenom' => $donnees['prenom'],
                'nom' => $donnees['nom'],
                'email' => $donnees['email'],
                'telephone' => $donnees['telephone'] ?? null,
                'role' => User::ROLE_ENSEIGNANT,
                'password' => $donnees['password'] ?? self::MOT_DE_PASSE_PAR_DEFAUT,
            ]);

            return $user->enseignant()->create([
                'matricule' => $donnees['matricule'],
                'specialite' => $donnees['specialite'] ?? null,
            ]);
        });

        return response()->json($enseignant->load(['user', 'ecs.ue.classe']), 201);
    }

    public function show(Enseignant $enseignant)
    {
        return $enseignant->load(['user', 'ecs.ue.classe']);
    }

    public function update(Request $request, Enseignant $enseignant)
    {
        $donnees = $this->valider($request, $enseignant);

        DB::transaction(function () use ($enseignant, $donnees) {
            $champsUser = [
                'prenom' => $donnees['prenom'],
                'nom' => $donnees['nom'],
                'email' => $donnees['email'],
                'telephone' => $donnees['telephone'] ?? null,
            ];
            if (! empty($donnees['password'])) {
                $champsUser['password'] = $donnees['password'];
            }
            $enseignant->user->update($champsUser);

            $enseignant->update([
                'matricule' => $donnees['matricule'],
                'specialite' => $donnees['specialite'] ?? null,
            ]);
        });

        return $enseignant->fresh(['user', 'ecs.ue.classe']);
    }

    public function destroy(Enseignant $enseignant)
    {
        // Ses EC restent mais n'ont plus d'enseignant (nullOnDelete)
        $enseignant->user->delete();

        return response()->json(['message' => 'Enseignant supprimé.']);
    }

    private function valider(Request $request, ?Enseignant $enseignant = null): array
    {
        return $request->validate([
            'prenom' => 'required|string|max:100',
            'nom' => 'required|string|max:100',
            'email' => ['required', 'email', Rule::unique('users')->ignore($enseignant?->user_id)],
            'telephone' => 'nullable|string|max:20',
            'password' => 'nullable|string|min:6',
            'matricule' => ['required', 'string', 'max:30', Rule::unique('enseignants')->ignore($enseignant?->id)],
            'specialite' => 'nullable|string|max:150',
        ], [
            'email.unique' => 'Cet email est déjà utilisé.',
            'matricule.unique' => 'Ce matricule est déjà attribué.',
        ]);
    }
}
