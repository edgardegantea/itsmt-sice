<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\User;
use App\Domains\Academico\Models\Periodo;

class PermisoSindical extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'permisos_sindicales';

    protected $fillable = [
        'docente_id',
        'tipo_permiso',
        'fecha_inicio',
        'fecha_fin',
        'dias_totales',
        'con_goce_sueldo',
        'motivo',
        'oficio_generado',
        'autorizado_por',
        'periodo_id',
    ];

    protected $casts = [
        'fecha_inicio'    => 'date',
        'fecha_fin'       => 'date',
        'dias_totales'    => 'integer',
        'con_goce_sueldo' => 'boolean',
        'oficio_generado' => 'boolean',
    ];

    public function docente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'docente_id');
    }

    public function autorizadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'autorizado_por');
    }

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class, 'periodo_id');
    }
}
