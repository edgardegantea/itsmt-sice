<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class MovilidadEstudiantil extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'movilidad_estudiantil';

    protected $fillable = [
        'alumno_id', 'convenio_id', 'ies_receptora', 'semestres_acumulados_movilidad',
        'fecha_inicio', 'fecha_fin', 'materias_cursadas', 'estatus',
    ];

    protected $casts = [
        'fecha_inicio'                  => 'date',
        'fecha_fin'                     => 'date',
        'materias_cursadas'             => 'array',
        'semestres_acumulados_movilidad' => 'integer',
    ];

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'alumno_id');
    }

    public function convenio(): BelongsTo
    {
        return $this->belongsTo(ConvenioMovilidad::class, 'convenio_id');
    }
}
