<?php

namespace App\Domains\Personal\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class SolicitudPersonal extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'solicitudes_personal';

    protected $fillable = [
        'solicitante_id', 'tipo_id', 'fecha_inicio', 'fecha_fin',
        'motivo', 'documentos', 'estatus', 'observaciones',
        'atendida_por', 'url_documento_oficial',
    ];

    protected function casts(): array
    {
        return [
            'documentos'  => 'array',
            'fecha_inicio'=> 'date',
            'fecha_fin'   => 'date',
        ];
    }

    public function solicitante(): BelongsTo
    {
        return $this->belongsTo(User::class, 'solicitante_id');
    }

    public function tipo(): BelongsTo
    {
        return $this->belongsTo(TipoSolicitudPersonal::class, 'tipo_id');
    }

    public function atendidaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'atendida_por');
    }
}
