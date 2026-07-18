<?php

namespace App\Domains\Infraestructura\Models;

use App\Domains\Academico\Models\Aula;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Inventario extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'inventario';

    protected $fillable = [
        'clave', 'nombre', 'categoria', 'descripcion', 'aula_id',
        'estado', 'fecha_adquisicion', 'valor', 'responsable_id', 'activo',
    ];

    protected $casts = [
        'fecha_adquisicion' => 'date',
        'valor'             => 'decimal:2',
        'activo'            => 'boolean',
    ];

    public function aula(): BelongsTo         { return $this->belongsTo(Aula::class); }
    public function responsable(): BelongsTo  { return $this->belongsTo(User::class, 'responsable_id'); }
    public function prestamos(): HasMany      { return $this->hasMany(PrestamoEquipo::class, 'inventario_id'); }
    public function mantenimientos(): HasMany { return $this->hasMany(SolicitudMantenimiento::class, 'inventario_id'); }
}
