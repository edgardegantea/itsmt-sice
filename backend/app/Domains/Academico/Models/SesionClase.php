<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SesionClase extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'sesiones_clase';

    protected $fillable = [
        'grupo_id',
        'docente_id',
        'fecha',
        'hora_inicio',
        'hora_fin',
        'tema',
    ];

    public function grupo(): BelongsTo
    {
        return $this->belongsTo(Grupo::class);
    }

    public function docente(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'docente_id');
    }

    public function asistencias(): HasMany
    {
        return $this->hasMany(Asistencia::class, 'sesion_id');
    }
}
