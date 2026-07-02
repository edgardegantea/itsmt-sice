<?php

namespace App\Domains\Capacitacion\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CedulaInscripcion extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'cedulas_inscripcion_capacitacion';

    protected $fillable = [
        'curso_id', 'usuario_id', 'rfc', 'curp', 'sexo',
        'grado_maximo_estudios', 'nombre_carrera', 'area_adscripcion',
        'puesto', 'clave_presupuestal', 'jefe_inmediato',
        'telefono_oficial', 'ext', 'horario_laboral',
        'estatus', 'calificacion', 'num_asistencias',
    ];

    protected function casts(): array
    {
        return [
            'calificacion'   => 'decimal:2',
            'num_asistencias'=> 'integer',
        ];
    }

    public function curso(): BelongsTo
    {
        return $this->belongsTo(CursoCapacitacion::class, 'curso_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function asistencias(): HasMany
    {
        return $this->hasMany(\App\Domains\Capacitacion\Models\AsistenciaCapacitacion::class, 'cedula_id');
    }
}
