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
        'estatus', 'caracterizacion', 'intencion_didactica', 'competencias',
        'fuentes_informacion', 'apoyos_didacticos', 'calendarizacion',
        'fecha_entrega', 'observaciones_revision', 'revisado_por', 'revisado_en',
    ];

    protected $casts = [
        'competencias'    => 'array',
        'calendarizacion' => 'array',
        'fecha_entrega'   => 'date',
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
