<?php

namespace App\Domains\Titulacion\Models;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Materia;
use App\Domains\Academico\Models\Periodo;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class SalidaLateral extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'salida_lateral';

    protected $fillable = [
        'alumno_id', 'periodo_solicitud_id', 'porcentaje_creditos_al_solicitar',
        'asignatura_especialidad_id', 'estatus', 'url_diploma', 'aprobado_por',
    ];

    protected $casts = [
        'porcentaje_creditos_al_solicitar' => 'float',
    ];

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(Alumno::class);
    }

    public function periodoSolicitud(): BelongsTo
    {
        return $this->belongsTo(Periodo::class, 'periodo_solicitud_id');
    }

    public function asignaturaEspecialidad(): BelongsTo
    {
        return $this->belongsTo(Materia::class, 'asignatura_especialidad_id');
    }

    public function aprobadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aprobado_por');
    }
}
