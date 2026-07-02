<?php

namespace App\Domains\Academico\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class AsignacionDocente extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'asignaciones_docentes';

    protected $fillable = [
        'docente_id', 'materia_id', 'carrera_id', 'periodo_id', 'grupo_id',
        'horas_semana', 'asignado_por', 'notificado',
    ];

    protected function casts(): array
    {
        return [
            'notificado'  => 'boolean',
            'horas_semana'=> 'integer',
        ];
    }

    public function docente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'docente_id');
    }

    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class);
    }

    public function carrera(): BelongsTo
    {
        return $this->belongsTo(Carrera::class);
    }

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class);
    }

    public function grupo(): BelongsTo
    {
        return $this->belongsTo(Grupo::class);
    }

    public function asignadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'asignado_por');
    }

    public function instrumentacion(): HasOne
    {
        return $this->hasOne(InstrumentacionDidactica::class, 'asignacion_id');
    }
}
