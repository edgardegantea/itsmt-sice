<?php

namespace App\Domains\Vinculacion\Models;

use App\Domains\Academico\Models\Alumno;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class SolicitudRp extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'solicitudes_rp';

    protected $fillable = [
        'alumno_id', 'opcion', 'datos_empresa', 'numero_seguro_social',
        'tipo_seguro', 'periodo_proyectado', 'estatus',
    ];

    protected $casts = [
        'datos_empresa' => 'array',
    ];

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(Alumno::class);
    }

    public function dictamen(): HasOne
    {
        return $this->hasOne(DictamenAnteproyecto::class, 'solicitud_rp_id');
    }

    public function residencia(): HasOne
    {
        return $this->hasOne(ResidenciaProfesional::class, 'solicitud_rp_id');
    }
}
