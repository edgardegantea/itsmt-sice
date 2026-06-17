<?php

namespace App\Domains\Institucional\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class DirectorioPersonal extends Model
{
    protected $table = 'directorio_personal';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'nombre',
        'cargo',
        'area',
        'area_id',
        'puesto_id',
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function directorio_area(): BelongsTo
    {
        return $this->belongsTo(DirectorioArea::class, 'area_id');
    }

    public function puesto(): BelongsTo
    {
        return $this->belongsTo(DirectorioPuesto::class, 'puesto_id');
    }

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => $m->id ??= Str::uuid()->toString());
    }
}
