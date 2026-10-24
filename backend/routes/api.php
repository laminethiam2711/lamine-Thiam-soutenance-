<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClasseController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DomaineController;
use App\Http\Controllers\EcController;
use App\Http\Controllers\EnseignantController;
use App\Http\Controllers\EspaceEnseignantController;
use App\Http\Controllers\EspaceEtudiantController;
use App\Http\Controllers\EtudiantController;
use App\Http\Controllers\MentionController;
use App\Http\Controllers\SpecialiteController;
use App\Http\Controllers\UeController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API — Système de gestion des notes et résultats académiques (LMD)
|--------------------------------------------------------------------------
| Préfixe /api · authentification par jeton Sanctum (Authorization: Bearer <token>)
*/

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {

    // Commun
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/mot-de-passe', [AuthController::class, 'changerMotDePasse']);

    // ---------- Administrateur ----------
    Route::middleware('role:admin')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index']);

        // Offre de formation : domaine > mention > spécialité > classe
        Route::apiResource('domaines', DomaineController::class)->except('show');
        Route::apiResource('mentions', MentionController::class)->except('show');
        Route::apiResource('specialites', SpecialiteController::class)->except('show');
        Route::apiResource('classes', ClasseController::class)->parameters(['classes' => 'classe']);
        Route::get('/classes/{classe}/resultats', [ClasseController::class, 'resultats']);
        Route::post('/classes/{classe}/deliberation', [ClasseController::class, 'deliberer']);

        // Programme : UE et EC
        Route::apiResource('ues', UeController::class)->parameters(['ues' => 'ue'])->except('show');
        Route::apiResource('ecs', EcController::class)->parameters(['ecs' => 'ec'])->except(['index', 'show']);

        // Personnes
        Route::apiResource('etudiants', EtudiantController::class)->parameters(['etudiants' => 'etudiant']);
        Route::get('/etudiants/{etudiant}/bulletin', [EtudiantController::class, 'bulletin']);
        Route::apiResource('enseignants', EnseignantController::class)->parameters(['enseignants' => 'enseignant']);
    });

    // ---------- Enseignant ----------
    Route::middleware('role:enseignant')->prefix('enseignant')->group(function () {
        Route::get('/ecs', [EspaceEnseignantController::class, 'mesEcs']);
        Route::get('/ecs/{ec}/notes', [EspaceEnseignantController::class, 'notesEc']);
        Route::post('/ecs/{ec}/notes', [EspaceEnseignantController::class, 'enregistrerNotes']);
    });

    // ---------- Étudiant ----------
    Route::middleware('role:etudiant')->prefix('etudiant')->group(function () {
        Route::get('/bulletin', [EspaceEtudiantController::class, 'bulletin']);
        Route::get('/resume', [EspaceEtudiantController::class, 'resume']);
    });
});
