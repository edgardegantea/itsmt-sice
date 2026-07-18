<?php

namespace App\Domains\Infraestructura\Models;

use App\Domains\Academico\Models\Aula;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class SolicitudMantenimiento extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'solicitudes_mantenimiento';

    protected $fillable = [
        'inventario_id', 'aula_id', 'reportado_por', 'tipo', 'descripcion',
        'prioridad', 'estatus', 'fecha_reporte', 'fecha_resolucion',
        'atendido_por', 'notas_resolucion',
    ];

    protected $casts = [
        'fecha_reporte'    => 'date',
        'fecha_resolucion' => 'date',
    ];

    public function inventario(): BelongsTo { return $this->belongsTo(Inventario::class, 'inventario_id'); }
    public function aula(): BelongsTo       { return $this->belongsTo(Aula::class); }
    public function reportador(): BelongsTo { return $this->belongsTo(User::class, 'reportado_por'); }
    public function atendedor(): BelongsTo  { return $this->belongsTo(User::class, 'atendido_por'); }
}
