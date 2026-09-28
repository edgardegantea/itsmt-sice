<?php

namespace App\Domains\Comunicacion\Models;

use App\Domains\Academico\Models\Carrera;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Comunicado extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'comunicados';

    protected $fillable = [
        'titulo',
        'contenido',
        'resumen',
        'prioridad',
        'categoria',
        'destinatario_rol',
        'carrera_id',
        'fijado',
        'requiere_confirmacion',
        'publicado_at',
        'expira_at',
        'publicado_por_id',
        'activo',
    ];

    protected $casts = [
        'fijado'                 => 'boolean',
        'requiere_confirmacion' => 'boolean',
        'activo'                => 'boolean',
        'publicado_at'          => 'datetime',
        'expira_at'             => 'datetime',
    ];

    public function publicadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'publicado_por_id');
    }

    public function carrera(): BelongsTo
    {
        return $this->belongsTo(Carrera::class, 'carrera_id');
    }

    public function lecturas(): HasMany
    {
        return $this->hasMany(ComunicadoLectura::class, 'comunicado_id');
    }

    /**
     * Scope para obtener sólo comunicados vigentes y activos.
     */
    public function scopeVigentes($query)
    {
        return $query->where('activo', true)
            ->where(function ($q) {
                $q->whereNull('publicado_at')->orWhere('publicado_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('expira_at')->orWhere('expira_at', '>=', now());
            });
    }
}
