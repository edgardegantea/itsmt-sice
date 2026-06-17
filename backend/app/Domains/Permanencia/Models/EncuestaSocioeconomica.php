<?php

namespace App\Domains\Permanencia\Models;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Periodo;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class EncuestaSocioeconomica extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'encuestas_socioeconomicas';

    protected $fillable = [
        'alumno_id', 'periodo_id', 'semestre',
        // Fase 1 — Datos personales
        'foto_infantil_path',
        'dp_curp', 'dp_fecha_nacimiento', 'dp_lugar_nacimiento',
        'dp_sexo', 'dp_estado_civil', 'dp_telefono', 'dp_email',
        'dp_municipio_procedencia', 'dp_escuela_bachillerato',
        // I
        'con_quien_vive', 'beca', 'tiene_beca', 'ingreso_propio',
        // III Padre
        'padre_nivel_educativo', 'padre_situacion_laboral', 'padre_ocupacion',
        'padre_centro_trabajo', 'padre_cargo', 'padre_tiempo_servicio',
        'padre_ingresos_mensuales', 'padre_otros_ingresos',
        // IV Madre
        'madre_nivel_educativo', 'madre_situacion_laboral', 'madre_ocupacion',
        'madre_centro_trabajo', 'madre_cargo', 'madre_tiempo_servicio',
        'madre_ingresos_mensuales', 'madre_otros_ingresos',
        // V Familia
        'familia_total_integrantes', 'familia_num_hijos',
        'familia_edades_hijos', 'familia_num_estudiantes',
        // VI Vivienda
        'vivienda_calle', 'vivienda_numero', 'vivienda_colonia', 'vivienda_municipio',
        'vivienda_tipo', 'vivienda_tipo_propiedad', 'vivienda_otras_propiedades',
        'tiene_vehiculo', 'vehiculos', 'traslado_escuela',
        'total_ingresos_familia', 'otros_ingresos_familia',
        'gastos_mensuales', 'total_egresos_familia',
        // VII Salud
        'salud_estado', 'salud_problema_familiar', 'salud_especifique',
        // VIII
        'informacion_adicional',
        'enviada_at',
    ];

    protected function casts(): array
    {
        return [
            'tiene_beca'              => 'boolean',
            'tiene_vehiculo'          => 'boolean',
            'salud_problema_familiar' => 'boolean',
            'vehiculos'               => 'array',
            'gastos_mensuales'        => 'array',
            'enviada_at'              => 'datetime',
            'padre_ingresos_mensuales'=> 'float',
            'madre_ingresos_mensuales'=> 'float',
            'total_ingresos_familia'  => 'float',
            'otros_ingresos_familia'  => 'float',
            'total_egresos_familia'   => 'float',
        ];
    }

    protected $appends = ['foto_infantil_url'];

    public function getFotoInfantilUrlAttribute(): ?string
    {
        return $this->foto_infantil_path
            ? asset('storage/' . $this->foto_infantil_path)
            : null;
    }

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(Alumno::class);
    }

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class);
    }

    public function getEnviadaAttribute(): bool
    {
        return $this->enviada_at !== null;
    }
}
