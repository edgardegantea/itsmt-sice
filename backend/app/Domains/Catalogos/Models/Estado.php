<?php

namespace App\Domains\Catalogos\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Estado extends Model
{
    protected $fillable = ['nombre', 'clave_curp'];

    public function municipios(): HasMany
    {
        return $this->hasMany(Municipio::class);
    }
}
