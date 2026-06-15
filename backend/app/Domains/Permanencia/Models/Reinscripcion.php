<?php

namespace App\Domains\Permanencia\Models;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Periodo;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Reinscripcion extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'reinscripciones';

    protected $fillable = [
        'alumno_id',
        'periodo_id',
        'estatus',
        'observaciones',
        'aprobado_por',
        'aprobado_en',
        'recibo_cobro_id',
        'resello_registrado',
        'fecha_resello',
        'resello_por',
    ];

    protected $casts = [
        'aprobado_en'        => 'datetime',
        'fecha_resello'      => 'date',
        'resello_registrado' => 'boolean',
    ];

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(Alumno::class);
    }

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class);
    }

    public function aprobadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aprobado_por');
    }

    public function reselloPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resello_por');
    }
}
