<?php

namespace App\Domains\Calidad\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TipoActividad extends Model
{
    use HasUuids;

    protected $table = 'tipos_actividad';

    protected $fillable = ['clave', 'nombre', 'horas_requeridas', 'activo'];

    protected $casts = [
        'horas_requeridas' => 'decimal:2',
        'activo'           => 'boolean',
    ];

    public function actividades(): HasMany
    {
        return $this->hasMany(ActividadComplementaria::class, 'tipo_id');
    }
}
