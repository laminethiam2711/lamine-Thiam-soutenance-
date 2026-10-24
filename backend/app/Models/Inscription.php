<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/** Inscription d'un étudiant dans une classe pour une année académique */
class Inscription extends Model
{
    protected $fillable = ['etudiant_id', 'classe_id'];

    public function etudiant(): BelongsTo
    {
        return $this->belongsTo(Etudiant::class);
    }

    public function classe(): BelongsTo
    {
        return $this->belongsTo(Classe::class);
    }

    public function notes(): HasMany
    {
        return $this->hasMany(Note::class);
    }

    public function resultatAnnuel(): HasOne
    {
        return $this->hasOne(ResultatAnnuel::class);
    }
}
