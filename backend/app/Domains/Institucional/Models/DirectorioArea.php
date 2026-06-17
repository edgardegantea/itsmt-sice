<?php

namespace App\Domains\Institucional\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class DirectorioArea extends Model
{
    protected $table = 'directorio_areas';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['nombre', 'descripcion', 'tipo', 'orden', 'activo'];

    protected $casts = ['activo' => 'boolean', 'orden' => 'integer'];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => $m->id ??= Str::uuid()->toString());
    }

    public function puestos(): HasMany
    {
        return $this->hasMany(DirectorioPuesto::class, 'area_id');
    }

    public function personal(): HasMany
    {
        return $this->hasMany(DirectorioPersonal::class, 'area_id');
    }
}
