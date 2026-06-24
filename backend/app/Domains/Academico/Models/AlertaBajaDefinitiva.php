<?php

namespace App\Domains\Academico\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AlertaBajaDefinitiva extends Model
{
    use HasUuids;

    protected $table = 'alertas_baja_definitiva';

    protected $fillable = [
        'alumno_id',
        'grupo_id',
        'periodo_id',
        'materia_nombre',
        'intento_numero',
        'revisada',
        'revisada_por',
        'revisada_en',
    ];

    protected function casts(): array
    {
        return [
            'revisada'   => 'boolean',
            'revisada_en'=> 'datetime',
        ];
    }

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(Alumno::class);
    }

    public function grupo(): BelongsTo
    {
        return $this->belongsTo(Grupo::class);
    }

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class);
    }

    public function revisadaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revisada_por');
    }
}
