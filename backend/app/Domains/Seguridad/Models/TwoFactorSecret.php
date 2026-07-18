<?php

namespace App\Domains\Seguridad\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TwoFactorSecret extends Model
{
    use HasUuids;

    protected $table = 'two_factor_secrets';

    protected $fillable = ['user_id', 'secret', 'recovery_codes', 'enabled', 'confirmed_at'];

    protected $casts = [
        'secret'         => 'encrypted',
        'recovery_codes' => 'encrypted:array',
        'enabled'        => 'boolean',
        'confirmed_at'   => 'datetime',
    ];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
