<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Unité d'Enseignement : regroupe des EC et donne des crédits si elle est validée */
class Ue extends Model
{
    protected $table = 'ues';

    protected $fillable = ['classe_id', 'code', 'libelle', 'credits', 'semestre'];

    protected function casts(): array
    {
        return ['credits' => 'integer', 'semestre' => 'integer'];
    }

    public function classe(): BelongsTo
    {
        return $this->belongsTo(Classe::class);
    }

    public function ecs(): HasMany
    {
        return $this->hasMany(Ec::class);
    }
}
