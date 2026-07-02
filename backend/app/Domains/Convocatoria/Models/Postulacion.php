<?php

namespace App\Domains\Convocatoria\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\User;

class Postulacion extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'postulaciones';

    protected $fillable = [
        'convocatoria_id',
        'user_id',
        'estatus',
        'documentos',
        'observaciones',
        'revisado_por',
        'fecha_postulacion',
    ];

    protected $casts = [
        'documentos'       => 'array',
        'fecha_postulacion' => 'datetime',
    ];

    public function convocatoria(): BelongsTo
    {
        return $this->belongsTo(Convocatoria::class, 'convocatoria_id');
    }

    public function postulante(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function revisadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revisado_por');
    }
}
