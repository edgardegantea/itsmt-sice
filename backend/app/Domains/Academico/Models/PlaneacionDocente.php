<?php

namespace App\Domains\Academico\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PlaneacionDocente extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'planeaciones_docentes';

    protected $fillable = [
        'carga_academica_id', 'docente_id', 'periodo_id', 'archivo_url',
        'archivo_path', 'archivo_nombre',
        'estatus', 'caracterizacion', 'intencion_didactica', 'competencia_asignatura', 'competencias',
        'fuentes_informacion', 'apoyos_didacticos', 'calendarizacion',
        'fecha_entrega', 'entregada_en', 'observaciones_revision', 'observaciones_campos', 'revisado_por', 'revisado_en',
    ];

    protected $casts = [
        'competencias'         => 'array',
        'calendarizacion'      => 'array',
        'observaciones_campos' => 'array',
        'fecha_entrega'   => 'date',
        'entregada_en'    => 'datetime',
        'revisado_en'     => 'datetime',
    ];

    public function cargaAcademica(): BelongsTo
    {
        return $this->belongsTo(CargaAcademica::class);
    }

    public function docente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'docente_id');
    }

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class);
    }

    public function revisadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revisado_por');
    }
}
