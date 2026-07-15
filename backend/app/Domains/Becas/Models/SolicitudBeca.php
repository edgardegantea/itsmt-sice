<?php

namespace App\Domains\Becas\Models;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Periodo;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class SolicitudBeca extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'solicitudes_beca';

    protected $fillable = [
        'alumno_id', 'periodo_id', 'tipo_beca',
        'promedio', 'ingreso_familiar', 'estatus',
        'observaciones', 'validado_por', 'validado_en',
    ];

    protected $casts = [
        'promedio'         => 'decimal:2',
        'ingreso_familiar' => 'decimal:2',
        'validado_en'      => 'datetime',
    ];

    public function alumno(): BelongsTo   { return $this->belongsTo(Alumno::class); }
    public function periodo(): BelongsTo  { return $this->belongsTo(Periodo::class); }
    public function validador(): BelongsTo { return $this->belongsTo(User::class, 'validado_por'); }
    public function becaAsignada(): HasOne { return $this->hasOne(BecaAsignada::class, 'solicitud_beca_id'); }
}
