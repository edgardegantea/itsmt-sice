<?php

namespace App\Domains\Academico\Models;

use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Models\Inscripcion;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Periodo extends Model
{
    use HasUuids;

    protected $fillable = [
        'nombre', 'fecha_inicio', 'fecha_fin', 'activo', 'tipo',
        'fecha_limite_baja_parcial', 'fecha_limite_baja_temporal',
        'horarios_liberados',
    ];

    protected function casts(): array
    {
        return [
            'fecha_inicio'               => 'date',
            'fecha_fin'                  => 'date',
            'activo'                     => 'boolean',
            'horarios_liberados'         => 'boolean',
            'fecha_limite_baja_parcial'  => 'date',
            'fecha_limite_baja_temporal' => 'date',
        ];
    }

    public function aspirantes(): HasMany
    {
        return $this->hasMany(Aspirante::class);
    }

    public function inscripciones(): HasMany
    {
        return $this->hasMany(Inscripcion::class);
    }
}
