<?php

namespace App\Domains\Academico\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class VacanteBolsaTrabajo extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'vacantes_bolsa_trabajo';

    protected $fillable = [
        'empresa', 'puesto', 'descripcion', 'carrera_id', 'rango_salarial',
        'modalidad', 'contacto_email', 'fecha_publicacion', 'fecha_cierre',
        'activa', 'publicado_por',
    ];

    protected $casts = [
        'fecha_publicacion' => 'date',
        'fecha_cierre'      => 'date',
        'activa'            => 'boolean',
    ];

    public function carrera(): BelongsTo         { return $this->belongsTo(Carrera::class); }
    public function publicador(): BelongsTo      { return $this->belongsTo(User::class, 'publicado_por'); }
    public function postulaciones(): HasMany      { return $this->hasMany(PostulacionBolsaTrabajo::class, 'vacante_id'); }
}
