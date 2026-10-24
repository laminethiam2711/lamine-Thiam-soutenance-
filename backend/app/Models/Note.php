<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Notes d'une inscription dans un EC : MCC, examen et éventuel rattrapage */
class Note extends Model
{
    protected $fillable = ['inscription_id', 'ec_id', 'mcc', 'examen', 'rattrapage'];

    protected function casts(): array
    {
        return ['mcc' => 'float', 'examen' => 'float', 'rattrapage' => 'float'];
    }

    public function inscription(): BelongsTo
    {
        return $this->belongsTo(Inscription::class);
    }

    public function ec(): BelongsTo
    {
        return $this->belongsTo(Ec::class);
    }
}
