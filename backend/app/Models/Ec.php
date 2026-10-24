<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Élément Constitutif d'une UE (une matière), avec son coefficient */
class Ec extends Model
{
    protected $table = 'ecs';

    protected $fillable = ['ue_id', 'libelle', 'coefficient', 'enseignant_id'];

    protected function casts(): array
    {
        return ['coefficient' => 'integer'];
    }

    public function ue(): BelongsTo
    {
        return $this->belongsTo(Ue::class);
    }

    public function enseignant(): BelongsTo
    {
        return $this->belongsTo(Enseignant::class);
    }

    public function notes(): HasMany
    {
        return $this->hasMany(Note::class);
    }
}
