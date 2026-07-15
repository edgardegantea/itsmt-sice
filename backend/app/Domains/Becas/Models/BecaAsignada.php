<?php

namespace App\Domains\Becas\Models;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Periodo;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class BecaAsignada extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'becas_asignadas';

    protected $fillable = [
        'solicitud_beca_id', 'alumno_id', 'periodo_id', 'tipo_beca',
        'monto_mensual', 'duracion_meses', 'estatus',
        'fecha_inicio', 'fecha_fin',
        'motivo_cancelacion', 'asignado_por', 'cancelado_por', 'cancelado_en',
    ];

    protected $casts = [
        'monto_mensual' => 'decimal:2',
        'fecha_inicio'  => 'date',
        'fecha_fin'     => 'date',
        'cancelado_en'  => 'datetime',
    ];

    public function solicitud(): BelongsTo  { return $this->belongsTo(SolicitudBeca::class, 'solicitud_beca_id'); }
    public function alumno(): BelongsTo     { return $this->belongsTo(Alumno::class); }
    public function periodo(): BelongsTo    { return $this->belongsTo(Periodo::class); }
    public function asignador(): BelongsTo  { return $this->belongsTo(User::class, 'asignado_por'); }
    public function cancelador(): BelongsTo { return $this->belongsTo(User::class, 'cancelado_por'); }
}
