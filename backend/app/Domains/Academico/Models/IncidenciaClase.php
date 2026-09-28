<?php

namespace App\Domains\Academico\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Bitácora de prefectura: cada registro es una revisión de ronda (usualmente cada
 * hora) a un grupo/aula, comparando lo observado contra lo que el horario dice que
 * debería estar pasando ahí — sirve para llevar el historial de cumplimiento por
 * docente, grupo, semestre y carrera.
 */
class IncidenciaClase extends Model
{
    use HasUuids;

    protected $table = 'incidencias_clase';

    protected $fillable = [
        'periodo_id',
        'grupo_id',
        'carga_academica_id',
        'docente_id',
        'aula_id',
        'registrado_por_id',
        'fecha',
        'hora_revision',
        'dia_semana',
        'estatus',
        'docente_presente',
        'coincide_horario',
        'alumnos_presentes',
        'observaciones',
    ];

    protected function casts(): array
    {
        return [
            'fecha'             => 'date',
            'docente_presente'  => 'boolean',
            'coincide_horario'  => 'boolean',
            'alumnos_presentes' => 'integer',
        ];
    }

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class);
    }

    public function grupo(): BelongsTo
    {
        return $this->belongsTo(Grupo::class);
    }

    public function cargaAcademica(): BelongsTo
    {
        return $this->belongsTo(CargaAcademica::class);
    }

    public function docente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'docente_id');
    }

    public function aula(): BelongsTo
    {
        return $this->belongsTo(Aula::class);
    }

    public function registradoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registrado_por_id');
    }
}
