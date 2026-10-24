<?php

namespace App\Http\Controllers;

use App\Models\Etudiant;
use App\Models\User;
use App\Services\CalculMoyenneService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Gestion des étudiants par l'administrateur.
 * Créer un étudiant = créer son compte (rôle « etudiant ») + son inscription dans une classe.
 */
class EtudiantController extends Controller
{
    public const MOT_DE_PASSE_PAR_DEFAUT = 'passer123';

    public function index(Request $request)
    {
        return Etudiant::with(['user', 'inscription.classe'])
            ->when($request->filled('classe_id'), fn ($q) => $q->whereHas('inscription',
                fn ($i) => $i->where('classe_id', $request->classe_id)))
            ->when($request->filled('recherche'), function ($q) use ($request) {
                $terme = '%'.$request->recherche.'%';
                $q->where(function ($q) use ($terme) {
                    $q->where('matricule', 'like', $terme)
                        ->orWhereHas('user', fn ($u) => $u->where('nom', 'like', $terme)
                            ->orWhere('prenom', 'like', $terme)
                            ->orWhere('email', 'like', $terme));
                });
            })
            ->orderBy('matricule')
            ->get();
    }

    public function store(Request $request)
    {
        $d = $this->valider($request);

        $etudiant = DB::transaction(function () use ($d) {
            $user = User::create([
                'prenom' => $d['prenom'],
                'nom' => $d['nom'],
                'email' => $d['email'],
                'telephone' => $d['telephone'] ?? null,
                'role' => User::ROLE_ETUDIANT,
                'password' => $d['password'] ?? self::MOT_DE_PASSE_PAR_DEFAUT,
            ]);
            $etudiant = $user->etudiant()->create([
                'matricule' => $d['matricule'],
                'sexe' => $d['sexe'],
                'date_naissance' => $d['date_naissance'] ?? null,
                'lieu_naissance' => $d['lieu_naissance'] ?? null,
            ]);
            $etudiant->inscriptions()->create(['classe_id' => $d['classe_id']]);

            return $etudiant;
        });

        return response()->json($etudiant->load(['user', 'inscription.classe']), 201);
    }

    public function show(Etudiant $etudiant)
    {
        return $etudiant->load(['user', 'inscription.classe']);
    }

    public function update(Request $request, Etudiant $etudiant)
    {
        $d = $this->valider($request, $etudiant);

        DB::transaction(function () use ($etudiant, $d) {
            $champsUser = [
                'prenom' => $d['prenom'],
                'nom' => $d['nom'],
                'email' => $d['email'],
                'telephone' => $d['telephone'] ?? null,
            ];
            if (! empty($d['password'])) {
                $champsUser['password'] = $d['password'];
            }
            $etudiant->user->update($champsUser);

            $etudiant->update([
                'matricule' => $d['matricule'],
                'sexe' => $d['sexe'],
                'date_naissance' => $d['date_naissance'] ?? null,
                'lieu_naissance' => $d['lieu_naissance'] ?? null,
            ]);

            // Changement de classe : on modifie l'inscription de l'année en cours
            $inscription = $etudiant->inscription;
            if ($inscription && $inscription->classe_id !== (int) $d['classe_id']) {
                $inscription->update(['classe_id' => $d['classe_id']]);
            } elseif (! $inscription) {
                $etudiant->inscriptions()->create(['classe_id' => $d['classe_id']]);
            }
        });

        return $etudiant->fresh(['user', 'inscription.classe']);
    }

    public function destroy(Etudiant $etudiant)
    {
        // Supprimer le compte supprime l'étudiant, ses inscriptions et ses notes (cascade)
        $etudiant->user->delete();

        return response()->json(['message' => 'Étudiant supprimé.']);
    }

    public function bulletin(Request $request, Etudiant $etudiant, CalculMoyenneService $service)
    {
        abort_if(! $etudiant->inscription, 404, "Cet étudiant n'est inscrit dans aucune classe.");

        return $service->bulletin($etudiant->inscription, $request->integer('semestre') ?: null);
    }

    private function valider(Request $request, ?Etudiant $etudiant = null): array
    {
        return $request->validate([
            'prenom' => 'required|string|max:100',
            'nom' => 'required|string|max:100',
            'email' => ['required', 'email', Rule::unique('users')->ignore($etudiant?->user_id)],
            'telephone' => 'nullable|string|max:20',
            'password' => 'nullable|string|min:6',
            'matricule' => ['required', 'string', 'max:30', Rule::unique('etudiants')->ignore($etudiant?->id)],
            'sexe' => 'required|in:M,F',
            'classe_id' => 'required|exists:classes,id',
            'date_naissance' => 'nullable|date|before:today',
            'lieu_naissance' => 'nullable|string|max:100',
        ], [
            'email.unique' => 'Cet email est déjà utilisé.',
            'matricule.unique' => 'Cet identifiant est déjà attribué.',
        ]);
    }
}
