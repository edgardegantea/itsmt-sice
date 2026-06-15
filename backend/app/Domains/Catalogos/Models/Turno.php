<?php

namespace App\Domains\Catalogos\Models;

use Illuminate\Database\Eloquent\Model;

class Turno extends Model
{
    protected $fillable = ['nombre', 'clave', 'activo'];

    protected $casts = ['activo' => 'boolean'];
}
