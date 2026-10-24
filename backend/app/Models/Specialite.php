<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Spécialité, ex. « IAGE », rattachée à une mention */
class Specialite extends Model
{
    protected $fillable = ['mention_id', 'code', 'libelle'];

    public function mention(): BelongsTo
    {
        return $this->belongsTo(Mention::class);
    }

    public function classes(): HasMany
    {
        return $this->hasMany(Classe::class);
    }
}
