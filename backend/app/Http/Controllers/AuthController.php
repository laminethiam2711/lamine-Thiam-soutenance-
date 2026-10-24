<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Connexion : vérifie l'email et le mot de passe puis renvoie un jeton Sanctum.
     */
    public function login(Request $request)
    {
        $donnees = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $donnees['email'])->first();

        if (! $user || ! Hash::check($donnees['password'], $user->password)) {
            return response()->json(['message' => 'Email ou mot de passe incorrect.'], 401);
        }

        $token = $user->createToken('gestion-notes')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->profil($user),
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($this->profil($request->user()));
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnexion réussie.']);
    }

    public function changerMotDePasse(Request $request)
    {
        $donnees = $request->validate([
            'ancien_mot_de_passe' => 'required|string',
            'nouveau_mot_de_passe' => 'required|string|min:6|confirmed',
        ]);

        $user = $request->user();

        if (! Hash::check($donnees['ancien_mot_de_passe'], $user->password)) {
            return response()->json(['message' => "L'ancien mot de passe est incorrect."], 422);
        }

        $user->update(['password' => $donnees['nouveau_mot_de_passe']]);

        return response()->json(['message' => 'Mot de passe modifié avec succès.']);
    }

    private function profil(User $user): array
    {
        $user->loadMissing('etudiant.inscription.classe.specialite', 'enseignant');

        return [
            'id' => $user->id,
            'prenom' => $user->prenom,
            'nom' => $user->nom,
            'nom_complet' => $user->nom_complet,
            'email' => $user->email,
            'telephone' => $user->telephone,
            'role' => $user->role,
            'etudiant' => $user->etudiant,
            'enseignant' => $user->enseignant,
        ];
    }
}
