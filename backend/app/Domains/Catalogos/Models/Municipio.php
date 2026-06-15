<?php

namespace App\Domains\Catalogos\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Municipio extends Model
{
    protected $fillable = ['estado_id', 'nombre'];

    public function estado(): BelongsTo
    {
        return $this->belongsTo(Estado::class);
    }

    public function escuelas(): HasMany
    {
        return $this->hasMany(EscuelaBachillerato::class);
    }
}
