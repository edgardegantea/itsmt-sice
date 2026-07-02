<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class InscripcionVerano extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'inscripciones_verano';

    protected $fillable = [
        'alumno_id', 'curso_verano_id', 'calificacion', 'acreditado',
    ];

    protected $casts = [
        'calificacion' => 'decimal:2',
        'acreditado'   => 'boolean',
    ];

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'alumno_id');
    }

    public function cursoVerano(): BelongsTo
    {
        return $this->belongsTo(CursoVerano::class, 'curso_verano_id');
    }
}
