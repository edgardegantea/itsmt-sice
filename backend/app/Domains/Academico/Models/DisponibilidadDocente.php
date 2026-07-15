<?php

namespace App\Domains\Academico\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DisponibilidadDocente extends Model
{
    use HasUuids;

    protected $table = 'disponibilidades_docente';

    protected $fillable = [
        'docente_id',
        'periodo_id',
        'dia_semana',
        'hora_inicio',
        'hora_fin',
    ];

    public function docente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'docente_id');
    }

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class);
    }
}
