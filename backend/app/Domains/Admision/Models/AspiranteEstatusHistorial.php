<?php

namespace App\Domains\Admision\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AspiranteEstatusHistorial extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $table = 'aspirante_estatus_historial';

    protected $fillable = [
        'aspirante_id',
        'estatus_anterior',
        'estatus_nuevo',
        'motivo',
        'cambiado_por',
    ];

    protected $attributes = [
        'created_at' => null,
    ];

    protected static function booted(): void
    {
        static::creating(function (self $registro) {
            $registro->created_at ??= now();
        });

        // Registro append-only (TecNM-AC-PO-001 S1-03): un cambio de estatus ya
        // auditado no debe editarse ni borrarse.
        static::updating(fn () => throw new \RuntimeException('El historial de estatus de aspirantes es de solo lectura.'));
        static::deleting(fn () => throw new \RuntimeException('El historial de estatus de aspirantes es de solo lectura.'));
    }

    public function aspirante(): BelongsTo
    {
        return $this->belongsTo(Aspirante::class);
    }

    public function cambiadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cambiado_por');
    }
}
