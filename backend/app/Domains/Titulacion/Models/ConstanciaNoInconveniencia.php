<?php

namespace App\Domains\Titulacion\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConstanciaNoInconveniencia extends Model
{
    use HasUuids;

    protected $table = 'constancias_no_inconveniencia';

    protected $fillable = [
        'solicitud_id', 'emitida_por', 'url_pdf', 'fecha_emision',
    ];

    protected $casts = [
        'fecha_emision' => 'date',
    ];

    public function solicitud(): BelongsTo
    {
        return $this->belongsTo(SolicitudActoProtocolario::class, 'solicitud_id');
    }

    public function emitidaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'emitida_por');
    }
}
