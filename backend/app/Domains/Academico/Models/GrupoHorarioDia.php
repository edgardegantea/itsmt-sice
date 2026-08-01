<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GrupoHorarioDia extends Model
{
    use HasUuids;

    protected $table = 'grupo_horarios_dia';

    protected $fillable = ['grupo_id', 'dia_semana', 'hora_inicio', 'hora_fin'];

    public function grupo(): BelongsTo
    {
        return $this->belongsTo(Grupo::class);
    }

    /**
     * La columna `time` de la BD se serializa con segundos ("07:00:00"); se
     * normaliza a "H:i" para que el valor que el frontend recibe sea el mismo
     * formato que la validación de store/update espera al reenviarlo (evita
     * un 422 al editar un grupo sin tocar su horario por día).
     */
    protected function horaInicio(): Attribute
    {
        return Attribute::make(get: fn ($value) => $value ? substr($value, 0, 5) : $value);
    }

    protected function horaFin(): Attribute
    {
        return Attribute::make(get: fn ($value) => $value ? substr($value, 0, 5) : $value);
    }
}
