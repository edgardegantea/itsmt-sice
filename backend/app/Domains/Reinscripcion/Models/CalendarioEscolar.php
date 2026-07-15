<?php

namespace App\Domains\Reinscripcion\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class CalendarioEscolar extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'calendarios_escolar';

    protected $fillable = [
        'periodo_id',
        'periodo_escolar',
        'actividades',
        'elaboro_nombre',
        'elaboro_fecha',
        'autorizo_nombre',
        'autorizo_fecha',
        'autorizado_por',
        'autorizado',
    ];

    protected $casts = [
        'actividades'   => 'array',
        'elaboro_fecha' => 'date',
        'autorizo_fecha'=> 'date',
        'autorizado'    => 'boolean',
    ];

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(\App\Domains\Academico\Models\Periodo::class);
    }

    public function autorizadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'autorizado_por');
    }
}
