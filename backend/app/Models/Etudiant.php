<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Etudiant extends Model
{
    protected $fillable = ['user_id', 'matricule', 'sexe', 'date_naissance', 'lieu_naissance'];

    protected function casts(): array
    {
        return ['date_naissance' => 'date:Y-m-d'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function inscriptions(): HasMany
    {
        return $this->hasMany(Inscription::class);
    }

    /** Inscription de l'année en cours (la plus récente) */
    public function inscription(): HasOne
    {
        return $this->hasOne(Inscription::class)->latestOfMany();
    }
}
