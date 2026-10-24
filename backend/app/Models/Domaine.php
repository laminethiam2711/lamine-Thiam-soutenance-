<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Domaine de formation, ex. « Sciences et Technologies » */
class Domaine extends Model
{
    protected $fillable = ['libelle'];

    public function mentions(): HasMany
    {
        return $this->hasMany(Mention::class);
    }
}
