<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Traslado extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'alumno_id', 'tipo', 'instituto_origen', 'instituto_destino',
        'fecha_solicitud', 'estatus', 'constancia_no_inconveniencia_url',
        'kardex_url', 'motivo_rechazo',
    ];

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'alumno_id');
    }
}
