<?php

namespace App\Domains\Academico\Models;

use App\Domains\Admision\Models\Inscripcion;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Alumno extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'user_id',
        'inscripcion_id',
        'numero_control',
        'carrera_id',
        'periodo_ingreso_id',
        'semestre_actual',
        'estatus',
        'fecha_cambio_estatus',
        'autorizacion_consulta_expediente',
        'pendiente_certificado_bachillerato',
        'plantel',
        'modalidad',
        'nivel',
        'observaciones_estatus',
    ];

    protected function casts(): array
    {
        return [
            'fecha_cambio_estatus'               => 'date',
            'pendiente_certificado_bachillerato' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function inscripcion(): BelongsTo
    {
        return $this->belongsTo(Inscripcion::class);
    }

    public function carrera(): BelongsTo
    {
        return $this->belongsTo(Carrera::class);
    }

    public function periodoIngreso(): BelongsTo
    {
        return $this->belongsTo(Periodo::class, 'periodo_ingreso_id');
    }
}
