<?php

namespace App\Domains\Academico\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlaneacionArchivo extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $table = 'planeacion_docente_archivos';

    protected $fillable = [
        'planeacion_docente_id', 'subido_por', 'unidad', 'nombre_original', 'path', 'mime_type', 'tamano_bytes', 'created_at',
    ];

    protected $casts = [
        'unidad'      => 'integer',
        'tamano_bytes' => 'integer',
        'created_at'  => 'datetime',
    ];

    public function subidoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'subido_por');
    }
}
