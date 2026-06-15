<?php

namespace App\Domains\Cobros\Models;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Admision\Models\Inscripcion;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ReciboCobro extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'recibos_cobro';

    protected $fillable = [
        'inscripcion_id',
        'alumno_id',
        'folio_fiscal',
        'rfc_emisor',
        'nombre_pagador',
        'rfc_pagador',
        'concepto',
        'importe',
        'sello_digital_cfdi',
        'numero_certificado_sat',
        'registrado_por',
    ];

    protected function casts(): array
    {
        return ['importe' => 'decimal:2'];
    }

    public function inscripcion(): BelongsTo
    {
        return $this->belongsTo(Inscripcion::class);
    }

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(Alumno::class);
    }

    public function registradoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registrado_por');
    }
}
