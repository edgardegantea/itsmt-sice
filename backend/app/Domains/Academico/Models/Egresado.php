<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Egresado extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'alumno_id',
        'anio_egreso',
        'titulado',
        'fecha_titulacion',
        'empresa_actual',
        'puesto_actual',
        'sector',
        'correo_actualizado',
    ];

    protected $casts = [
        'titulado'         => 'boolean',
        'fecha_titulacion' => 'date',
        'anio_egreso'      => 'integer',
    ];

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'alumno_id');
    }

    public function historialLaboral(): HasMany { return $this->hasMany(HistorialLaboralEgresado::class, 'egresado_id'); }
    public function encuestas(): HasMany        { return $this->hasMany(EncuestaSeguimientoEgresado::class, 'egresado_id'); }
    public function postulaciones(): HasMany    { return $this->hasMany(PostulacionBolsaTrabajo::class, 'egresado_id'); }
}
