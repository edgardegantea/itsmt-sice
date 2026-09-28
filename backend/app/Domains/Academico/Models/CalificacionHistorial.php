<?php

namespace App\Domains\Academico\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalificacionHistorial extends Model
{
    use HasUuids;

    protected $table = 'calificaciones_historial';

    public $timestamps = false;

    protected $fillable = [
        'calificacion_id', 'alumno_id', 'grupo_id', 'carga_academica_id', 'editado_por',
        'parciales_anteriores', 'parciales_nuevos',
        'calificacion_final_anterior', 'calificacion_final_nueva',
        'promedio_anterior', 'promedio_nuevo',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'parciales_anteriores' => 'array',
            'parciales_nuevos'     => 'array',
            'created_at'           => 'datetime',
        ];
    }

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(Alumno::class);
    }

    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'editado_por');
    }

    public function calificacion(): BelongsTo
    {
        return $this->belongsTo(Calificacion::class);
    }
}
