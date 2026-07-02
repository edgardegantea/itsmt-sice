<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ExpedienteAlumnoExt extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'expedientes_alumnos_ext';

    protected $fillable = [
        'alumno_id',
        'generacion',
        'estatus',
        'promedio_general',
        'creditos_acumulados',
        'documentos_entregados',
        'notas_admin',
    ];

    protected $casts = [
        'generacion'            => 'integer',
        'promedio_general'      => 'decimal:2',
        'creditos_acumulados'   => 'integer',
        'documentos_entregados' => 'array',
    ];

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(Alumno::class);
    }
}
