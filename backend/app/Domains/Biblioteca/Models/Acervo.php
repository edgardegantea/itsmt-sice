<?php

namespace App\Domains\Biblioteca\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Acervo extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'acervo';

    protected $fillable = [
        'isbn', 'titulo', 'autor', 'editorial',
        'anio_edicion', 'edicion', 'categoria',
        'clasificacion_dewey', 'total_ejemplares',
        'ejemplares_disponibles', 'activo',
    ];

    protected $casts = [
        'activo'                 => 'boolean',
        'total_ejemplares'       => 'integer',
        'ejemplares_disponibles' => 'integer',
    ];

    public function ejemplares(): HasMany { return $this->hasMany(Ejemplar::class); }
}
