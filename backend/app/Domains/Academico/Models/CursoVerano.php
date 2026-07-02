<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CursoVerano extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'cursos_verano';

    protected $fillable = [
        'periodo_padre_id', 'materia_id', 'docente_id', 'aula_id',
        'fecha_inicio', 'fecha_fin', 'max_alumnos', 'min_alumnos', 'estatus',
    ];

    protected $casts = [
        'fecha_inicio' => 'date',
        'fecha_fin'    => 'date',
        'max_alumnos'  => 'integer',
        'min_alumnos'  => 'integer',
    ];

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class, 'periodo_padre_id');
    }

    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class, 'materia_id');
    }

    public function docente(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'docente_id');
    }

    public function aula(): BelongsTo
    {
        return $this->belongsTo(Aula::class, 'aula_id');
    }

    public function inscripciones(): HasMany
    {
        return $this->hasMany(InscripcionVerano::class, 'curso_verano_id');
    }
}
