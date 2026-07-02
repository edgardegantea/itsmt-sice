<?php

namespace App\Domains\Vinculacion\Models;

use App\Domains\Academico\Models\Alumno;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DictamenAnteproyecto extends Model
{
    use HasUuids;

    protected $table = 'dictamenes_anteproyecto';

    protected $fillable = [
        'solicitud_rp_id', 'alumno_id', 'anteproyecto', 'empresa',
        'asesor_interno_id', 'asesor_externo', 'dictamen', 'fecha_dictamen',
        'url_pdf', 'presidente_academia_id', 'jefe_depto_id', 'subdirector_academico_id',
    ];

    protected $casts = [
        'fecha_dictamen' => 'date',
    ];

    public function solicitudRp(): BelongsTo
    {
        return $this->belongsTo(SolicitudRp::class, 'solicitud_rp_id');
    }

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(Alumno::class);
    }

    public function asesorInterno(): BelongsTo
    {
        return $this->belongsTo(User::class, 'asesor_interno_id');
    }

    public function presidenteAcademia(): BelongsTo
    {
        return $this->belongsTo(User::class, 'presidente_academia_id');
    }

    public function jefeDepto(): BelongsTo
    {
        return $this->belongsTo(User::class, 'jefe_depto_id');
    }

    public function subdirectorAcademico(): BelongsTo
    {
        return $this->belongsTo(User::class, 'subdirector_academico_id');
    }
}
