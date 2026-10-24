<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Vérifie que l'utilisateur connecté a l'un des rôles autorisés.
 * Utilisation dans les routes : ->middleware('role:admin') ou 'role:admin,enseignant'
 */
class CheckRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! in_array($user->role, $roles, true)) {
            return response()->json([
                'message' => "Accès refusé : vous n'avez pas les droits nécessaires.",
            ], 403);
        }

        return $next($request);
    }
}
