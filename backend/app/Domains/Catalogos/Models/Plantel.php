<?php

namespace App\Domains\Catalogos\Models;

use Illuminate\Database\Eloquent\Model;

class Plantel extends Model
{
    protected $table = 'planteles';

    protected $fillable = ['nombre', 'clave', 'activo'];

    protected $casts = ['activo' => 'boolean'];
}
