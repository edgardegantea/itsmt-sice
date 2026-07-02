<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Convalidacion extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'convalidaciones';

    protected $fillable = [
        'alumno_id', 'materia_origen_nombre', 'materia_origen_clave',
        'calificacion_obtenida', 'institucion_origen', 'materia_equivalente_id',
        'dictamen_url', 'registrado_por',
    ];

    protected $casts = [
        'calificacion_obtenida' => 'decimal:2',
    ];

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'alumno_id');
    }

    public function materiaEquivalente(): BelongsTo
    {
        return $this->belongsTo(Materia::class, 'materia_equivalente_id');
    }

    public function registradoPor(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'registrado_por');
    }
}
