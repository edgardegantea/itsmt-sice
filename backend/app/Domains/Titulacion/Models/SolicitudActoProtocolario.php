<?php

namespace App\Domains\Titulacion\Models;

use App\Domains\Academico\Models\Alumno;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class SolicitudActoProtocolario extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'solicitudes_acto_protocolario';

    protected $fillable = [
        'alumno_id', 'modalidad_id', 'estatus',
        'motivo_improcedencia', 'retake_plazo_hasta',
    ];

    protected $casts = [
        'retake_plazo_hasta' => 'date',
    ];

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(Alumno::class);
    }

    public function modalidad(): BelongsTo
    {
        return $this->belongsTo(ModalidadTitulacion::class, 'modalidad_id');
    }

    public function constanciaNoInconveniencia(): HasOne
    {
        return $this->hasOne(ConstanciaNoInconveniencia::class, 'solicitud_id');
    }

    public function actoProtocolario(): HasOne
    {
        return $this->hasOne(ActoProtocolario::class, 'solicitud_id');
    }
}
