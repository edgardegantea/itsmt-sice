<?php

namespace App\Domains\Permanencia\Models;

use App\Domains\Academico\Models\Periodo;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrdenReinscripcion extends Model
{
    use HasUuids;

    protected $table = 'orden_reinscripcion';

    protected $fillable = [
        'periodo_id',
        'carrera_id',
        'semestre',
        'fecha_inicio_reinscripcion',
        'fecha_fin_reinscripcion',
        'publicado',
        'publicado_por',
        'publicado_en',
    ];

    protected $casts = [
        'fecha_inicio_reinscripcion' => 'date',
        'fecha_fin_reinscripcion'    => 'date',
        'publicado'                  => 'boolean',
        'publicado_en'               => 'datetime',
    ];

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class);
    }

    public function carrera(): BelongsTo
    {
        return $this->belongsTo(\App\Domains\Academico\Models\Carrera::class);
    }

    public function publicadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'publicado_por');
    }
}
