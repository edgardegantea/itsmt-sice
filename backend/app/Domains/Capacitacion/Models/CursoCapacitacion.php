<?php

namespace App\Domains\Capacitacion\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CursoCapacitacion extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'cursos_capacitacion';

    protected $fillable = [
        'nombre', 'clave_registro_tecnm', 'tipo', 'modalidad', 'origen',
        'instructor', 'periodo_inicio', 'periodo_fin', 'horas_totales',
        'horario', 'jefe_depto_id', 'estatus',
    ];

    protected function casts(): array
    {
        return [
            'periodo_inicio' => 'date',
            'periodo_fin'    => 'date',
            'horas_totales'  => 'integer',
        ];
    }

    public function jefeDepto(): BelongsTo
    {
        return $this->belongsTo(User::class, 'jefe_depto_id');
    }

    public function cedulas(): HasMany
    {
        return $this->hasMany(CedulaInscripcion::class, 'curso_id');
    }
}
