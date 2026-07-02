<?php

namespace App\Domains\Capacitacion\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class AsistenciaCapacitacion extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'asistencias_capacitacion';

    protected $fillable = ['cedula_id', 'fecha', 'presente'];

    protected function casts(): array
    {
        return [
            'fecha'   => 'date',
            'presente'=> 'boolean',
        ];
    }

    public function cedula(): BelongsTo
    {
        return $this->belongsTo(CedulaInscripcion::class, 'cedula_id');
    }
}
