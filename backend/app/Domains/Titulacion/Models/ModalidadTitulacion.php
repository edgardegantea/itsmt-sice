<?php

namespace App\Domains\Titulacion\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ModalidadTitulacion extends Model
{
    use HasUuids;

    protected $table = 'modalidades_titulacion';

    protected $fillable = [
        'nombre', 'opcion_numero', 'descripcion',
        'requiere_examen', 'requiere_tesis', 'documentos_requeridos',
    ];

    protected $casts = [
        'requiere_examen'       => 'boolean',
        'requiere_tesis'        => 'boolean',
        'documentos_requeridos' => 'array',
        'opcion_numero'         => 'integer',
    ];

    public function solicitudes(): HasMany
    {
        return $this->hasMany(SolicitudActoProtocolario::class, 'modalidad_id');
    }
}
