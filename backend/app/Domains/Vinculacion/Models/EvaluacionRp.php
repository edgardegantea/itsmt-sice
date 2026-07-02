<?php

namespace App\Domains\Vinculacion\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class EvaluacionRp extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'evaluaciones_rp';

    protected $fillable = [
        'residencia_id', 'tipo', 'evaluador_tipo',
        'criterios', 'calificacion', 'fecha_evaluacion',
    ];

    protected $casts = [
        'criterios'        => 'array',
        'calificacion'     => 'float',
        'fecha_evaluacion' => 'date',
    ];

    public function residencia(): BelongsTo
    {
        return $this->belongsTo(ResidenciaProfesional::class, 'residencia_id');
    }
}
