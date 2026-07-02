<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\User;

class MovimientoPlaza extends Model
{
    use HasUuids;

    protected $table = 'movimientos_plaza';

    protected $fillable = [
        'ficha_sindical_id',
        'tipo_movimiento',
        'categoria_anterior',
        'categoria_nueva',
        'fecha_efectiva',
        'documento_soporte_url',
        'registrado_por',
        'notas',
    ];

    protected $casts = [
        'fecha_efectiva' => 'date',
    ];

    public function fichaSindical(): BelongsTo
    {
        return $this->belongsTo(FichaSindical::class, 'ficha_sindical_id');
    }

    public function registradoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registrado_por');
    }
}
