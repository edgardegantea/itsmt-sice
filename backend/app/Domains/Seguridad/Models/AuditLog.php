<?php

namespace App\Domains\Seguridad\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    use HasUuids;

    protected $table = 'audit_logs';

    public $timestamps = false;

    protected $fillable = [
        'user_id', 'accion', 'metodo', 'ruta', 'entidad', 'entidad_id',
        'status_code', 'ip_address', 'user_agent', 'metadata', 'created_at',
    ];

    protected $casts = [
        'metadata'   => 'array',
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
