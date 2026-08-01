<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CorteCaptura extends Model
{
    use HasUuids;

    protected $table = 'cortes_captura';

    protected $fillable = [
        'periodo_id', 'numero', 'nombre', 'fecha_corte', 'fecha_limite_captura',
    ];

    protected function casts(): array
    {
        return [
            'numero'               => 'integer',
            'fecha_corte'          => 'date',
            'fecha_limite_captura' => 'date',
        ];
    }

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class);
    }

    public function alertas(): HasMany
    {
        return $this->hasMany(AlertaCorteCaptura::class);
    }
}
