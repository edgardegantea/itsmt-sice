<?php

namespace App\Domains\Comunicacion\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComunicadoLectura extends Model
{
    use HasUuids;

    protected $table = 'comunicado_lecturas';

    public $timestamps = false;

    protected $fillable = [
        'comunicado_id',
        'user_id',
        'leido_at',
    ];

    protected $casts = [
        'leido_at' => 'datetime',
    ];

    public function comunicado(): BelongsTo
    {
        return $this->belongsTo(Comunicado::class, 'comunicado_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
