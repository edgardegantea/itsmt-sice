<?php

namespace App\Domains\Titulacion\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class ActoProtocolario extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'actos_protocolarios';

    protected $fillable = [
        'solicitud_id', 'fecha', 'hora', 'lugar', 'sinodales_json',
        'aviso_enviado_en', 'libro_actas_folio', 'resultado',
        'url_aviso_pdf', 'url_acta_pdf', 'url_constancia_exencion_pdf',
        'firmado_jefe_servicios', 'firmado_director',
    ];

    protected $casts = [
        'fecha'                   => 'date',
        'sinodales_json'          => 'array',
        'aviso_enviado_en'        => 'datetime',
        'firmado_jefe_servicios'  => 'boolean',
        'firmado_director'        => 'boolean',
    ];

    public function solicitud(): BelongsTo
    {
        return $this->belongsTo(SolicitudActoProtocolario::class, 'solicitud_id');
    }

    public function titulacion(): HasOne
    {
        return $this->hasOne(Titulacion::class, 'acto_protocolario_id');
    }
}
