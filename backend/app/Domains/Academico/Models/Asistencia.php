<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Asistencia extends Model
{
    use HasUuids;

    protected $table = 'asistencias';

    protected $fillable = [
        'sesion_id',
        'alumno_id',
        'estatus',
        'observacion',
    ];

    public function sesion(): BelongsTo
    {
        return $this->belongsTo(SesionClase::class, 'sesion_id');
    }

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'alumno_id');
    }
}
