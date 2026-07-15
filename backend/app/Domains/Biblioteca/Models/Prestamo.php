<?php

namespace App\Domains\Biblioteca\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Prestamo extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'ejemplar_id', 'user_id',
        'fecha_prestamo', 'fecha_devolucion_esperada', 'fecha_devolucion_real',
        'estatus', 'renovaciones', 'multa_acumulada', 'multa_pagada',
        'atendido_por',
    ];

    protected $casts = [
        'fecha_prestamo'             => 'date',
        'fecha_devolucion_esperada'  => 'date',
        'fecha_devolucion_real'      => 'date',
        'multa_acumulada'            => 'decimal:2',
        'multa_pagada'               => 'boolean',
        'renovaciones'               => 'integer',
    ];

    public function ejemplar(): BelongsTo  { return $this->belongsTo(Ejemplar::class); }
    public function usuario(): BelongsTo   { return $this->belongsTo(User::class, 'user_id'); }
    public function atendidoPor(): BelongsTo { return $this->belongsTo(User::class, 'atendido_por'); }
}
