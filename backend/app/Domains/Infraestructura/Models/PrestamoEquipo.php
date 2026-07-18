<?php

namespace App\Domains\Infraestructura\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PrestamoEquipo extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'prestamos_equipo';

    protected $fillable = [
        'inventario_id', 'solicitante_id', 'fecha_prestamo',
        'fecha_devolucion_prevista', 'fecha_devolucion_real', 'estatus', 'observaciones',
    ];

    protected $casts = [
        'fecha_prestamo'            => 'date',
        'fecha_devolucion_prevista' => 'date',
        'fecha_devolucion_real'     => 'date',
    ];

    public function inventario(): BelongsTo  { return $this->belongsTo(Inventario::class, 'inventario_id'); }
    public function solicitante(): BelongsTo { return $this->belongsTo(User::class, 'solicitante_id'); }
}
