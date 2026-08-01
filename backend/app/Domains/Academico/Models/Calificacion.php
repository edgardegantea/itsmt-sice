<?php

namespace App\Domains\Academico\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Calificacion extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'calificaciones';

    protected $fillable = [
        'alumno_id',
        'grupo_id',
        'carga_academica_id',
        'parciales',
        'calificacion_final',
        'promedio',
        'acreditado',
        'tipo_curso',
        'intento_numero',
        'oportunidad',
        'publicada',
        'kardex_actualizado',
    ];

    protected function casts(): array
    {
        return [
            'parciales'        => 'array',
            'calificacion_final' => 'decimal:2',
            'promedio'         => 'decimal:2',
            'acreditado'       => 'boolean',
            'intento_numero'   => 'integer',
            'publicada'        => 'boolean',
            'kardex_actualizado' => 'boolean',
        ];
    }

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(Alumno::class);
    }

    public function grupo(): BelongsTo
    {
        return $this->belongsTo(Grupo::class);
    }

    public function cargaAcademica(): BelongsTo
    {
        return $this->belongsTo(CargaAcademica::class);
    }

    /**
     * Determina tipo_curso e intento_numero para un alumno en una materia (identificada
     * por la carga académica exacta), contando cuántos intentos previos reprobó.
     * segundo intento => repeticion, tercer intento (o más) => especial.
     */
    public static function resolverTipoCurso(string $alumnoId, CargaAcademica $carga): array
    {
        $intentosPrevios = static::whereHas(
            'cargaAcademica',
            fn($q) => $q->where('materia_id', $carga->materia_id)
        )
            ->where('alumno_id', $alumnoId)
            ->where('carga_academica_id', '!=', $carga->id)
            ->whereNotNull('acreditado')
            ->where('acreditado', false)
            ->count();

        return match (true) {
            $intentosPrevios === 0 => ['ordinario', 1],
            $intentosPrevios === 1 => ['repeticion', 2],
            default               => ['especial', 3],
        };
    }
}
