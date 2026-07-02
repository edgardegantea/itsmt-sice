<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\User;

class ParticipanteConcurso extends Model
{
    use HasUuids;

    protected $table = 'participantes_concurso';

    protected $fillable = [
        'concurso_id',
        'docente_id',
        'puntaje_obtenido',
        'resultado',
        'movimiento_plaza_id',
    ];

    protected $casts = [
        'puntaje_obtenido' => 'float',
    ];

    public function concurso(): BelongsTo
    {
        return $this->belongsTo(ConcursoOposicion::class, 'concurso_id');
    }

    public function docente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'docente_id');
    }

    public function movimientoPlaza(): BelongsTo
    {
        return $this->belongsTo(MovimientoPlaza::class, 'movimiento_plaza_id');
    }
}
