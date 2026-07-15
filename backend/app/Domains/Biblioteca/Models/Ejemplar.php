<?php

namespace App\Domains\Biblioteca\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Ejemplar extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'ejemplares';

    protected $fillable = [
        'acervo_id', 'codigo_barras', 'numero_adquisicion',
        'estatus', 'observaciones',
    ];

    public function acervo(): BelongsTo { return $this->belongsTo(Acervo::class); }
    public function prestamos(): HasMany { return $this->hasMany(Prestamo::class); }
}
