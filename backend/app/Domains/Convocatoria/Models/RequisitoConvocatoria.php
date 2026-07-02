<?php

namespace App\Domains\Convocatoria\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RequisitoConvocatoria extends Model
{
    use HasUuids;

    protected $table = 'requisitos_convocatoria';

    protected $fillable = [
        'convocatoria_id',
        'descripcion',
        'tipo_documento',
        'obligatorio',
    ];

    protected $casts = [
        'obligatorio' => 'boolean',
    ];

    public function convocatoria(): BelongsTo
    {
        return $this->belongsTo(Convocatoria::class, 'convocatoria_id');
    }
}
