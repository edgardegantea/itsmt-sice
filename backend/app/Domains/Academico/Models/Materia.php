<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Materia extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'carrera_id', 'clave', 'clave_oficial_tecnm', 'nombre', 'semestre',
        'creditos', 'horas_teoria', 'horas_practica', 'tipo', 'activa',
    ];

    protected function casts(): array
    {
        return ['activa' => 'boolean'];
    }

    public function carrera(): BelongsTo
    {
        return $this->belongsTo(Carrera::class);
    }

    public function cargas(): HasMany
    {
        return $this->hasMany(CargaAcademica::class);
    }
}
