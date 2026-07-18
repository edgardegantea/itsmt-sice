<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EncuestaSeguimientoEgresado extends Model
{
    use HasUuids;

    protected $table = 'encuestas_seguimiento_egresados';

    protected $fillable = [
        'egresado_id', 'periodo_aplicacion', 'satisfaccion_formacion',
        'pertinencia_plan_estudios', 'empleabilidad_meses', 'recomendaria',
        'comentarios', 'estatus', 'fecha_respuesta',
    ];

    protected $casts = [
        'recomendaria'    => 'boolean',
        'fecha_respuesta' => 'datetime',
    ];

    public function egresado(): BelongsTo { return $this->belongsTo(Egresado::class, 'egresado_id'); }
}
