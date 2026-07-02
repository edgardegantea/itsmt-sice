<?php

namespace App\Domains\Titulacion\Models;

use App\Domains\Academico\Models\Alumno;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Titulacion extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'titulaciones';

    protected $fillable = [
        'alumno_id', 'modalidad_id', 'acto_protocolario_id',
        'estatus', 'etapa_actual', 'documentos',
    ];

    protected $casts = [
        'documentos' => 'array',
    ];

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(Alumno::class);
    }

    public function modalidad(): BelongsTo
    {
        return $this->belongsTo(ModalidadTitulacion::class, 'modalidad_id');
    }

    public function actoProtocolario(): BelongsTo
    {
        return $this->belongsTo(ActoProtocolario::class, 'acto_protocolario_id');
    }
}
