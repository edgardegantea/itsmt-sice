<?php

namespace App\Domains\Capacitacion\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class EvaluacionSeguimientoCap extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'evaluaciones_seguimiento_cap';

    protected $fillable = [
        'cedula_id', 'tipo_evaluador', 'jefe_inmediato_nombre',
        'respuestas_json', 'obstaculos_json', 'promedio', 'resultado',
    ];

    protected function casts(): array
    {
        return [
            'respuestas_json' => 'array',
            'obstaculos_json' => 'array',
            'promedio'        => 'decimal:2',
        ];
    }

    public function cedula(): BelongsTo
    {
        return $this->belongsTo(CedulaInscripcion::class, 'cedula_id');
    }
}
