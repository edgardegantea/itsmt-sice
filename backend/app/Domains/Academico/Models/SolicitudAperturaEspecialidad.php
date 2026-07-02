<?php

namespace App\Domains\Academico\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class SolicitudAperturaEspecialidad extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'solicitudes_apertura_especialidad';

    protected $fillable = [
        'carrera_id', 'nombre_propuesto', 'justificacion',
        'solicitante_id', 'estatus', 'dictaminada_por', 'observaciones',
    ];

    public function carrera(): BelongsTo
    {
        return $this->belongsTo(Carrera::class, 'carrera_id');
    }

    public function solicitante(): BelongsTo
    {
        return $this->belongsTo(User::class, 'solicitante_id');
    }

    public function dictaminadaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dictaminada_por');
    }
}
