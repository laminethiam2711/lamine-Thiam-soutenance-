<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tables métier du système de gestion des notes (organisation LMD de l'ISI).
 *
 *  Offre de formation
 *    domaines     : ex. Sciences et Technologies
 *    mentions     : ex. Informatique (dans un domaine)
 *    specialites  : ex. IAGE (dans une mention)
 *    classes      : ex. L3 IAGE 2025-2026 (grade, niveau, spécialité, année)
 *
 *  Programme d'une classe
 *    ues          : Unité d'Enseignement (code, crédits, semestre)
 *    ecs          : Élément Constitutif d'une UE (coefficient, enseignant)
 *
 *  Personnes et résultats
 *    enseignants, etudiants
 *    inscriptions      : un étudiant inscrit dans une classe pour une année
 *    notes             : MCC, examen et rattrapage d'une inscription dans un EC
 *    resultats_annuels : résultat de fin d'année enregistré lors de la délibération
 */
return new class extends Migration
{
    public function up(): void
    {
        // ---------- Offre de formation ----------
        Schema::create('domaines', function (Blueprint $table) {
            $table->id();
            $table->string('libelle')->unique();
            $table->timestamps();
        });

        Schema::create('mentions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('domaine_id')->constrained()->restrictOnDelete();
            $table->string('libelle');
            $table->timestamps();
            $table->unique(['domaine_id', 'libelle']);
        });

        Schema::create('specialites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mention_id')->constrained()->restrictOnDelete();
            $table->string('code', 20)->unique();      // ex. IAGE
            $table->string('libelle');                 // ex. Informatique Appliquée à la Gestion des Entreprises
            $table->timestamps();
        });

        Schema::create('classes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('specialite_id')->constrained()->restrictOnDelete();
            $table->string('libelle');                 // ex. L3 IAGE
            $table->enum('grade', ['Licence', 'Master'])->default('Licence');
            $table->unsignedTinyInteger('niveau');     // 1, 2 ou 3 (L1, L2, L3)
            $table->string('annee_academique');        // ex. 2025-2026
            $table->timestamps();
            $table->unique(['libelle', 'annee_academique']);
        });

        // ---------- Personnes ----------
        Schema::create('enseignants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('matricule')->unique();
            $table->string('specialite')->nullable();
            $table->timestamps();
        });

        Schema::create('etudiants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('matricule')->unique();      // identifiant, ex. 411-24-4494/ISI-KM
            $table->enum('sexe', ['M', 'F']);
            $table->date('date_naissance')->nullable();
            $table->string('lieu_naissance')->nullable();
            $table->timestamps();
        });

        Schema::create('inscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('etudiant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('classe_id')->constrained('classes')->restrictOnDelete();
            $table->timestamps();
            $table->unique(['etudiant_id', 'classe_id']);
        });

        // ---------- Programme ----------
        Schema::create('ues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('classe_id')->constrained('classes')->cascadeOnDelete();
            $table->string('code', 20);                // ex. MAP1304
            $table->string('libelle');
            $table->unsignedTinyInteger('credits');    // fixés par UE, indépendants des coefficients
            $table->unsignedTinyInteger('semestre');   // numéro LMD : 1 à 6
            $table->timestamps();
            $table->unique(['code', 'classe_id']);
        });

        Schema::create('ecs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ue_id')->constrained('ues')->cascadeOnDelete();
            $table->string('libelle');
            $table->unsignedTinyInteger('coefficient')->default(1);
            $table->foreignId('enseignant_id')->nullable()->constrained('enseignants')->nullOnDelete();
            $table->timestamps();
        });

        // ---------- Résultats ----------
        Schema::create('notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inscription_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ec_id')->constrained('ecs')->cascadeOnDelete();
            $table->decimal('mcc', 4, 2)->nullable();        // Moyenne de Contrôle Continu
            $table->decimal('examen', 4, 2)->nullable();
            $table->decimal('rattrapage', 4, 2)->nullable(); // remplace l'examen s'il est meilleur
            $table->timestamps();
            $table->unique(['inscription_id', 'ec_id']);
        });

        Schema::create('resultats_annuels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inscription_id')->unique()->constrained()->cascadeOnDelete();
            $table->decimal('moyenne_s1', 4, 2)->nullable();
            $table->decimal('moyenne_s2', 4, 2)->nullable();
            $table->decimal('moyenne_generale', 4, 2)->nullable();
            $table->unsignedTinyInteger('credits_s1')->default(0);
            $table->unsignedTinyInteger('credits_s2')->default(0);
            $table->unsignedTinyInteger('credits_total')->default(0);
            $table->string('decision');
            $table->timestamp('delibere_le');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['resultats_annuels', 'notes', 'ecs', 'ues', 'inscriptions', 'etudiants',
            'enseignants', 'classes', 'specialites', 'mentions', 'domaines'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
