<?php

namespace App\Domains\Permanencia\Models;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Periodo;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Baja extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'bajas';

    protected $fillable = [
        'alumno_id',
        'periodo_id',
        'tipo_baja',
        'estatus',
        'motivo_enum',
        'motivo_texto',
        'motivo_rechazo',
        'fecha_solicitud',
        'fecha_efectiva',
        'registrada_por',
        'revisada_por',
        'revisada_en',
        'numero_semestres_cursados',
        'reingreso_posible',
    ];

    protected $casts = [
        'fecha_solicitud'         => 'date',
        'fecha_efectiva'          => 'date',
        'reingreso_posible'       => 'boolean',
        'numero_semestres_cursados' => 'integer',
    ];

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(Alumno::class);
    }

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class);
    }

    public function registradaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registrada_por');
    }
}
