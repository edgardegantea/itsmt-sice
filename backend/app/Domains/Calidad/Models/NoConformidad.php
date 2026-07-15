<?php

namespace App\Domains\Calidad\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class NoConformidad extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'no_conformidades';

    protected $fillable = [
        'folio', 'tipo', 'proceso', 'descripcion', 'clausula_iso',
        'estatus', 'fecha_deteccion', 'fecha_cierre_esperada', 'fecha_cierre_real',
        'detectado_por', 'responsable_id', 'cerrado_por', 'causa_raiz',
    ];

    protected $casts = [
        'fecha_deteccion'      => 'date',
        'fecha_cierre_esperada'=> 'date',
        'fecha_cierre_real'    => 'date',
    ];

    public function detectador(): BelongsTo    { return $this->belongsTo(User::class, 'detectado_por'); }
    public function responsable(): BelongsTo   { return $this->belongsTo(User::class, 'responsable_id'); }
    public function cerrador(): BelongsTo      { return $this->belongsTo(User::class, 'cerrado_por'); }
    public function acciones(): HasMany        { return $this->hasMany(AccionCorrectiva::class, 'no_conformidad_id'); }
}
