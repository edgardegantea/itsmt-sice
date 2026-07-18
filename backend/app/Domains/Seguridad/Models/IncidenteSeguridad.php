<?php

namespace App\Domains\Seguridad\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IncidenteSeguridad extends Model
{
    use HasUuids;

    protected $table = 'incidentes_seguridad';

    protected $fillable = [
        'tipo', 'user_id', 'ip_address', 'descripcion', 'severidad',
        'estatus', 'detectado_en', 'resuelto_en', 'resuelto_por',
    ];

    protected $casts = [
        'detectado_en' => 'datetime',
        'resuelto_en'  => 'datetime',
    ];

    public function user(): BelongsTo     { return $this->belongsTo(User::class, 'user_id'); }
    public function resolvedor(): BelongsTo { return $this->belongsTo(User::class, 'resuelto_por'); }
}
