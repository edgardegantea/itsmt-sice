<?php

namespace App\Domains\Catalogos\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EscuelaBachillerato extends Model
{
    protected $table    = 'escuelas_bachillerato';
    protected $fillable = ['municipio_id', 'nombre', 'tipo', 'activa'];

    protected $casts = ['activa' => 'boolean'];

    public function municipio(): BelongsTo
    {
        return $this->belongsTo(Municipio::class);
    }
}
