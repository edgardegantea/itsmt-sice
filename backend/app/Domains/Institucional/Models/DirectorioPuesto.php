<?php

namespace App\Domains\Institucional\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class DirectorioPuesto extends Model
{
    protected $table = 'directorio_puestos';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['nombre', 'descripcion', 'funciones', 'area_id', 'firma_documentos', 'orden', 'activo'];

    protected $casts = [
        'firma_documentos' => 'boolean',
        'activo'           => 'boolean',
        'orden'            => 'integer',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => $m->id ??= Str::uuid()->toString());
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(DirectorioArea::class, 'area_id');
    }

    public function personal(): HasMany
    {
        return $this->hasMany(DirectorioPersonal::class, 'puesto_id');
    }
}
