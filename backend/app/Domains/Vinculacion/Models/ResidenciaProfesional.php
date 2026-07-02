<?php

namespace App\Domains\Vinculacion\Models;

use App\Domains\Academico\Models\Alumno;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ResidenciaProfesional extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'residencias_profesionales';

    protected $fillable = [
        'solicitud_rp_id', 'alumno_id', 'asesor_id', 'empresa', 'proyecto',
        'estatus', 'etapa_actual', 'horas_acumuladas',
        'calificacion_seguimiento_1', 'calificacion_seguimiento_2',
        'calificacion_reporte_final', 'calificacion_final',
        'carta_presentacion_generada', 'url_oficio_asesor',
    ];

    protected $casts = [
        'horas_acumuladas'           => 'integer',
        'etapa_actual'               => 'integer',
        'carta_presentacion_generada'=> 'boolean',
        'calificacion_seguimiento_1' => 'float',
        'calificacion_seguimiento_2' => 'float',
        'calificacion_reporte_final' => 'float',
        'calificacion_final'         => 'float',
    ];

    public function solicitudRp(): BelongsTo
    {
        return $this->belongsTo(SolicitudRp::class, 'solicitud_rp_id');
    }

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(Alumno::class);
    }

    public function asesor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'asesor_id');
    }

    public function asesorias(): HasMany
    {
        return $this->hasMany(AsesoriaRp::class, 'residencia_id');
    }

    public function evaluaciones(): HasMany
    {
        return $this->hasMany(EvaluacionRp::class, 'residencia_id');
    }
}
