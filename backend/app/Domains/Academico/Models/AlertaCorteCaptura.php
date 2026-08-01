<?php

namespace App\Domains\Academico\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AlertaCorteCaptura extends Model
{
    use HasUuids;

    protected $table = 'alertas_corte_captura';

    protected $fillable = [
        'corte_captura_id', 'carga_academica_id', 'docente_id', 'periodo_id',
        'porcentaje_capturado', 'total_unidades_temario', 'unidades_esperadas',
        'pendiente', 'leida_docente', 'leida_jefe', 'leida_director',
    ];

    protected $casts = [
        'porcentaje_capturado'   => 'float',
        'total_unidades_temario' => 'integer',
        'unidades_esperadas'     => 'integer',
        'pendiente'              => 'boolean',
        'leida_docente'          => 'boolean',
        'leida_jefe'             => 'boolean',
        'leida_director'         => 'boolean',
    ];

    public function corteCaptura(): BelongsTo
    {
        return $this->belongsTo(CorteCaptura::class);
    }

    public function cargaAcademica(): BelongsTo
    {
        return $this->belongsTo(CargaAcademica::class);
    }

    public function docente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'docente_id');
    }

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class);
    }
}
