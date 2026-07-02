<?php

namespace App\Domains\Personal\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TipoSolicitudPersonal extends Model
{
    use HasUuids;

    protected $table = 'tipos_solicitud_personal';

    protected $fillable = ['nombre', 'documentos_requeridos'];

    protected function casts(): array
    {
        return ['documentos_requeridos' => 'array'];
    }

    public function solicitudes(): HasMany
    {
        return $this->hasMany(SolicitudPersonal::class, 'tipo_id');
    }
}
