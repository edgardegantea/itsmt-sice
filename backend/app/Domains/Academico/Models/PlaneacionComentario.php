<?php

namespace App\Domains\Academico\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlaneacionComentario extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $table = 'planeacion_docente_comentarios';

    protected $fillable = [
        'planeacion_docente_id', 'autor_id', 'seccion', 'unidad', 'categoria', 'mensaje', 'resuelto', 'created_at',
    ];

    protected $casts = [
        'unidad'     => 'integer',
        'resuelto'   => 'boolean',
        'created_at' => 'datetime',
    ];

    public function autor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'autor_id');
    }
}
