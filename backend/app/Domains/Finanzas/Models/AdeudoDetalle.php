<?php

namespace App\Domains\Finanzas\Models;

use App\Domains\Permanencia\Models\Adeudo;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdeudoDetalle extends Model
{
    use HasUuids;

    protected $table = 'adeudos_detalle';

    protected $fillable = ['adeudo_id', 'partida', 'descripcion', 'monto'];

    protected $casts = ['monto' => 'decimal:2'];

    public function adeudo(): BelongsTo
    {
        return $this->belongsTo(Adeudo::class);
    }
}
