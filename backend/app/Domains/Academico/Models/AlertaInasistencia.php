<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AlertaInasistencia extends Model
{
    use HasUuids;

    protected $table = 'alertas_inasistencia';

    protected $fillable = [
        'alumno_id',
        'grupo_id',
        'porcentaje_inasistencia',
        'leida_docente',
        'leida_jefe',
        'leida_director',
    ];

    protected $casts = [
        'porcentaje_inasistencia' => 'float',
        'leida_docente'           => 'boolean',
        'leida_jefe'              => 'boolean',
        'leida_director'          => 'boolean',
    ];

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'alumno_id');
    }

    public function grupo(): BelongsTo
    {
        return $this->belongsTo(Grupo::class);
    }
}
