<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Registro idempotente: una fila por (horario, fecha) evita mandar el mismo
 * recordatorio dos veces si el comando programado corre más de una vez en el
 * mismo minuto o se reintenta. */
class RecordatorioAsistenciaEnviado extends Model
{
    use HasUuids;

    protected $table = 'recordatorios_asistencia_enviados';

    protected $fillable = ['horario_id', 'fecha'];

    protected function casts(): array
    {
        return ['fecha' => 'date'];
    }

    public function horario(): BelongsTo
    {
        return $this->belongsTo(Horario::class);
    }
}
