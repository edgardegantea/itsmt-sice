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
        'parciales',
        'calificacion_final',
        'promedio',
        'acreditado',
        'tipo_curso',
        'intento_numero',
        'oportunidad',
    ];

    protected function casts(): array
    {
        return [
            'parciales'        => 'array',
            'calificacion_final' => 'decimal:2',
            'promedio'         => 'decimal:2',
            'acreditado'       => 'boolean',
            'intento_numero'   => 'integer',
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
}
