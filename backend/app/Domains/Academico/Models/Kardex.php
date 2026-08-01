<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Historial académico permanente del alumno. Se alimenta al firmar el acta de
 * calificaciones (S4-07) — retención PERMANENTE, no se elimina en operación normal.
 */
class Kardex extends Model
{
    protected $table = 'kardex';

    public $incrementing = false;
    protected $keyType = 'string';

    protected static function boot(): void
    {
        parent::boot();
        static::creating(function (self $model) {
            $model->id ??= (string) \Illuminate\Support\Str::uuid();
        });
    }

    protected $fillable = [
        'alumno_id',
        'calificacion_id',
        'carga_academica_id',
        'grupo_id',
        'periodo_id',
        'materia_nombre',
        'promedio',
        'acreditado',
        'tipo_curso',
        'acta_calificaciones_id',
        'fecha_registro',
    ];

    protected function casts(): array
    {
        return [
            'promedio'       => 'decimal:2',
            'acreditado'     => 'boolean',
            'fecha_registro' => 'date',
        ];
    }

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(Alumno::class);
    }

    public function calificacion(): BelongsTo
    {
        return $this->belongsTo(Calificacion::class);
    }

    public function cargaAcademica(): BelongsTo
    {
        return $this->belongsTo(CargaAcademica::class);
    }

    public function grupo(): BelongsTo
    {
        return $this->belongsTo(Grupo::class);
    }

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class);
    }

    public function actaCalificaciones(): BelongsTo
    {
        return $this->belongsTo(ActaCalificaciones::class, 'acta_calificaciones_id');
    }
}
