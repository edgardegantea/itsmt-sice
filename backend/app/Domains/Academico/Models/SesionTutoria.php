<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class SesionTutoria extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'sesiones_tutoria';

    protected $fillable = [
        'tutor_id', 'tipo', 'fecha', 'duracion_minutos',
        'temas_tratados', 'observaciones', 'alumnos_atendidos_ids',
    ];

    protected $casts = [
        'fecha'                 => 'date',
        'alumnos_atendidos_ids' => 'array',
    ];

    public function tutor(): BelongsTo
    {
        return $this->belongsTo(Tutor::class);
    }
}
