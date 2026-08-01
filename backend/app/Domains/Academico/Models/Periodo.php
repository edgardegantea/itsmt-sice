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

    protected $appends = ['codigo'];

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

    /**
     * Código corto tipo TecNM: AAAA-1 (ene-jun) o AAAA-2 (ago-dic), derivado de
     * fecha_inicio — se usa como prefijo en la clave autogenerada de grupos.
     */
    public function getCodigoAttribute(): ?string
    {
        if (! $this->fecha_inicio) {
            return null;
        }
        $semestre = $this->fecha_inicio->month <= 6 ? 1 : 2;
        return "{$this->fecha_inicio->year}-{$semestre}";
    }

    public static function activo(): ?self
    {
        return static::where('activo', true)->first();
    }

    public function aspirantes(): HasMany
    {
        return $this->hasMany(Aspirante::class);
    }

    public function inscripciones(): HasMany
    {
        return $this->hasMany(Inscripcion::class);
    }

    public function cortesCaptura(): HasMany
    {
        return $this->hasMany(CorteCaptura::class)->orderBy('numero');
    }
}
