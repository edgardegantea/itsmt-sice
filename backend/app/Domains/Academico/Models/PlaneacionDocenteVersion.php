<?php

namespace App\Domains\Academico\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlaneacionDocenteVersion extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $table = 'planeacion_docente_versiones';

    protected $fillable = [
        'planeacion_docente_id', 'creado_por', 'motivo', 'snapshot', 'created_at',
    ];

    protected $casts = [
        'snapshot'   => 'array',
        'created_at' => 'datetime',
    ];

    public function planeacion(): BelongsTo
    {
        return $this->belongsTo(PlaneacionDocente::class, 'planeacion_docente_id');
    }

    public function creadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creado_por');
    }

    /** Campos que se comparan para el snapshot — deben coincidir con SNAPSHOT_CAMPOS del
     * controlador. Devuelve la lista de nombres de campo (no la etiqueta) que cambiaron
     * entre esta versión y otra (p. ej. la versión actual de la planeación), para mostrar
     * un resumen tipo "cambió: competencias, calendarización" sin hacer un diff profundo. */
    public function camposDistintosDe(array $otroSnapshot): array
    {
        $distintos = [];
        foreach ($this->snapshot as $campo => $valor) {
            $otro = $otroSnapshot[$campo] ?? null;
            // JSON-encode para comparar arrays anidados por valor sin depender del orden de claves.
            if (json_encode($valor) !== json_encode($otro)) {
                $distintos[] = $campo;
            }
        }
        return $distintos;
    }
}
