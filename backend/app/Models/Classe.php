<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Classe d'une année académique, ex. L3 IAGE 2025-2026.
 * Le niveau détermine les deux semestres LMD : L1 → S1/S2, L2 → S3/S4, L3 → S5/S6.
 */
class Classe extends Model
{
    protected $table = 'classes';

    protected $fillable = ['specialite_id', 'libelle', 'grade', 'niveau', 'annee_academique'];

    protected $appends = ['semestres'];

    protected function casts(): array
    {
        return ['niveau' => 'integer'];
    }

    /** Numéros des deux semestres de l'année, ex. [5, 6] pour une L3 */
    public function getSemestresAttribute(): array
    {
        return [$this->niveau * 2 - 1, $this->niveau * 2];
    }

    public function specialite(): BelongsTo
    {
        return $this->belongsTo(Specialite::class);
    }

    public function inscriptions(): HasMany
    {
        return $this->hasMany(Inscription::class);
    }

    public function ues(): HasMany
    {
        return $this->hasMany(Ue::class);
    }
}
