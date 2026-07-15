<?php

namespace App\Domains\Calidad\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccionCorrectiva extends Model
{
    use HasUuids;

    protected $table = 'acciones_correctivas';

    protected $fillable = [
        'no_conformidad_id', 'descripcion',
        'fecha_compromiso', 'fecha_implementacion',
        'estatus', 'responsable_id', 'evidencia_implementacion',
    ];

    protected $casts = [
        'fecha_compromiso'      => 'date',
        'fecha_implementacion'  => 'date',
    ];

    public function noConformidad(): BelongsTo { return $this->belongsTo(NoConformidad::class, 'no_conformidad_id'); }
    public function responsable(): BelongsTo   { return $this->belongsTo(User::class, 'responsable_id'); }
}
