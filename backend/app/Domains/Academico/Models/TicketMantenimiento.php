<?php

namespace App\Domains\Academico\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TicketMantenimiento extends Model
{
    use HasUuids;

    protected $table = 'tickets_mantenimiento';

    protected $fillable = [
        'incidencia_clase_id',
        'aula_id',
        'reportado_por_id',
        'atendido_por_id',
        'descripcion',
        'estatus',
        'notas_resolucion',
        'resuelto_en',
    ];

    protected function casts(): array
    {
        return [
            'resuelto_en' => 'datetime',
        ];
    }

    public function incidenciaClase(): BelongsTo
    {
        return $this->belongsTo(IncidenciaClase::class);
    }

    public function aula(): BelongsTo
    {
        return $this->belongsTo(Aula::class);
    }

    public function reportadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reportado_por_id');
    }

    public function atendidoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'atendido_por_id');
    }
}
