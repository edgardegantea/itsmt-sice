<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConfiguracionEvaluacion extends Model
{
    use HasUuids;

    protected $table = 'configuraciones_evaluacion';

    protected $fillable = [
        'carrera_id',
        'num_parciales',
        'calificacion_minima',
        'peso_parciales',
        'creditos_carga_minima',
        'creditos_carga_maxima',
        'max_especiales_por_periodo',
    ];

    protected function casts(): array
    {
        return [
            'peso_parciales'        => 'array',
            'calificacion_minima'   => 'decimal:1',
            'num_parciales'         => 'integer',
            'creditos_carga_minima' => 'integer',
            'creditos_carga_maxima' => 'integer',
            'max_especiales_por_periodo' => 'integer',
        ];
    }

    public function carrera(): BelongsTo
    {
        return $this->belongsTo(Carrera::class);
    }
}
