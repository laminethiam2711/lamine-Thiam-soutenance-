<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Enseignant extends Model
{
    protected $fillable = ['user_id', 'matricule', 'specialite'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Éléments constitutifs (EC) dont l'enseignant saisit les notes */
    public function ecs(): HasMany
    {
        return $this->hasMany(Ec::class);
    }
}
