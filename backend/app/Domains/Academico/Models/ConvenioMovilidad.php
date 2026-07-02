<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ConvenioMovilidad extends Model
{
    use HasUuids;

    protected $table = 'convenios_movilidad';

    protected $fillable = [
        'nombre_institucion', 'tipo', 'vigente_desde', 'vigente_hasta',
        'url_convenio', 'activo',
    ];

    protected $casts = [
        'activo'         => 'boolean',
        'vigente_desde'  => 'date',
        'vigente_hasta'  => 'date',
    ];

    public function movilidades(): HasMany
    {
        return $this->hasMany(MovilidadEstudiantil::class, 'convenio_id');
    }
}
