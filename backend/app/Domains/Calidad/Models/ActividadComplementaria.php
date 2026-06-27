<?php

namespace App\Domains\Calidad\Models;

use App\Domains\Academico\Models\Alumno;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ActividadComplementaria extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'actividades_complementarias';

    protected $fillable = [
        'alumno_id',
        'tipo_id',
        'horas',
        'evidencia_url',
        'estatus',
        'nivel_desempeno',
        'semestre_alumno_al_registrar',
        'validado_por',
        'observaciones_validacion',
    ];

    protected $casts = [
        'horas' => 'decimal:2',
        'semestre_alumno_al_registrar' => 'integer',
    ];

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(Alumno::class);
    }

    public function tipo(): BelongsTo
    {
        return $this->belongsTo(TipoActividad::class, 'tipo_id');
    }

    public function validador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validado_por');
    }
}
