<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaludSemestralCarrera extends Model
{
    use HasUuids;

    protected $table = 'salud_semestral_carrera';

    protected $fillable = [
        'periodo_id', 'carrera_id', 'semana', 'score',
        'pct_riesgo_academico', 'pct_ocupacion_aulas', 'pct_cumplimiento_docente', 'pct_incidencias_sin_novedad',
    ];

    protected function casts(): array
    {
        return ['semana' => 'date'];
    }

    public function carrera(): BelongsTo
    {
        return $this->belongsTo(Carrera::class);
    }

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class);
    }
}
