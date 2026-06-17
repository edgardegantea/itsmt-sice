<?php

namespace App\Domains\Institucional\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class DirectorioPersonal extends Model
{
    protected $table = 'directorio_personal';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'nombre',
        'cargo',
        'area',
        'email',
        'telefono',
        'extension',
        'orden',
        'activo',
        'firma_documentos',
    ];

    protected $casts = [
        'activo'           => 'boolean',
        'firma_documentos' => 'boolean',
        'orden'            => 'integer',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => $m->id ??= Str::uuid()->toString());
    }
}
