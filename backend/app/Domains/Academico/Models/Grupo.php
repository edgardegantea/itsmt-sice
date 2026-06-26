<?php

namespace App\Domains\Academico\Models;

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
        'carrera_id', 'periodo_id', 'clave', 'semestre',
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

    public function alumnos(): BelongsToMany
    {
        return $this->belongsToMany(Alumno::class, 'alumno_grupo')
            ->withPivot('fecha_asignacion')
            ->withTimestamps();
    }

    public function cargas(): HasMany
    {
        return $this->hasMany(CargaAcademica::class);
    }
}
