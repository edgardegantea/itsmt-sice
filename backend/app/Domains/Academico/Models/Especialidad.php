<?php

namespace App\Domains\Academico\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Especialidad extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'especialidades';

    protected $fillable = [
        'carrera_id', 'nombre', 'descripcion', 'estatus',
        'porcentaje_creditos_min', 'autorizada_por',
    ];

    public function carrera(): BelongsTo
    {
        return $this->belongsTo(Carrera::class, 'carrera_id');
    }

    public function autorizadaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'autorizada_por');
    }

    public function programas(): HasMany
    {
        return $this->hasMany(ProgramaEstudioEspecialidad::class, 'especialidad_id');
    }

    public function alumnos(): HasMany
    {
        return $this->hasMany(AlumnoEspecialidad::class, 'especialidad_id');
    }
}
