<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HistorialLaboralEgresado extends Model
{
    use HasUuids;

    protected $table = 'historial_laboral_egresados';

    protected $fillable = [
        'egresado_id', 'empresa', 'puesto', 'sector',
        'fecha_inicio', 'fecha_fin', 'rango_salarial', 'activo',
    ];

    protected $casts = [
        'fecha_inicio' => 'date',
        'fecha_fin'    => 'date',
        'activo'       => 'boolean',
    ];

    public function egresado(): BelongsTo { return $this->belongsTo(Egresado::class, 'egresado_id'); }
}
