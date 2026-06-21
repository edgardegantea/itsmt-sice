<?php

namespace App\Domains\Institucional\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

class FirmantePdf extends Model
{
    protected $table = 'firmantes_pdf';

    protected $fillable = ['clave', 'nombre', 'cargo', 'orden', 'activo'];

    protected function casts(): array
    {
        return ['activo' => 'boolean'];
    }

    /** Alias para que los blades existentes puedan usar ->name igual que con User */
    protected function name(): Attribute
    {
        return Attribute::make(get: fn () => $this->nombre);
    }
}
