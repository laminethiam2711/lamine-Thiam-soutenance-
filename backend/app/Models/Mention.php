<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Mention, ex. « Informatique », rattachée à un domaine */
class Mention extends Model
{
    protected $fillable = ['domaine_id', 'libelle'];

    public function domaine(): BelongsTo
    {
        return $this->belongsTo(Domaine::class);
    }

    public function specialites(): HasMany
    {
        return $this->hasMany(Specialite::class);
    }
}
