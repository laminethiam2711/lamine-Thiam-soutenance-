<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Résultat de fin d'année enregistré au moment de la délibération */
class ResultatAnnuel extends Model
{
    protected $table = 'resultats_annuels';

    protected $fillable = [
        'inscription_id', 'moyenne_s1', 'moyenne_s2', 'moyenne_generale',
        'credits_s1', 'credits_s2', 'credits_total', 'decision', 'delibere_le',
    ];

    protected function casts(): array
    {
        return [
            'moyenne_s1' => 'float', 'moyenne_s2' => 'float', 'moyenne_generale' => 'float',
            'delibere_le' => 'datetime',
        ];
    }

    public function inscription(): BelongsTo
    {
        return $this->belongsTo(Inscription::class);
    }
}
