<?php

namespace App\Domains\Academico\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActaCalificacionesCaptura extends Model
{
    use HasUuids;

    protected $table = 'actas_calificaciones_capturas';

    protected $fillable = [
        'grupo_id', 'carga_academica_id', 'periodo_id', 'folio',
        'generado_por', 'generado_en', 'firmado_por', 'firmado_en',
    ];

    protected function casts(): array
    {
        return [
            'generado_en' => 'datetime',
            'firmado_en'  => 'datetime',
        ];
    }

    public function grupo(): BelongsTo
    {
        return $this->belongsTo(Grupo::class);
    }

    public function cargaAcademica(): BelongsTo
    {
        return $this->belongsTo(CargaAcademica::class);
    }

    public function generadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generado_por');
    }

    public function firmadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'firmado_por');
    }
}
