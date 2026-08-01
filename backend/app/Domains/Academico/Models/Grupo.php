<?php

namespace App\Domains\Academico\Models;

use App\Domains\Catalogos\Models\Plantel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Grupo extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'carrera_id', 'periodo_id', 'plantel_id', 'clave', 'semestre',
        'turno', 'capacidad', 'activo', 'horarios_liberados',
    ];

    protected function casts(): array
    {
        return [
            'activo'             => 'boolean',
            'horarios_liberados' => 'boolean',
        ];
    }

    public function carrera(): BelongsTo
    {
        return $this->belongsTo(Carrera::class);
    }

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class);
    }

    public function plantel(): BelongsTo
    {
        return $this->belongsTo(Plantel::class);
    }

    public function alumnos(): BelongsToMany
    {
        return $this->belongsToMany(Alumno::class, 'alumno_grupo')
            ->withPivot('fecha_asignacion')
            ->withTimestamps();
    }

    public function cargas(): BelongsToMany
    {
        return $this->belongsToMany(CargaAcademica::class, 'carga_academica_grupo')->withTimestamps();
    }

    /** Ventana horaria personalizada por día (0 filas = sin restricción). */
    public function horariosDias(): HasMany
    {
        return $this->hasMany(GrupoHorarioDia::class)->orderByRaw(
            "case dia_semana " .
            "when 'lunes' then 1 when 'martes' then 2 when 'miercoles' then 3 " .
            "when 'jueves' then 4 when 'viernes' then 5 when 'sabado' then 6 end"
        );
    }
}
