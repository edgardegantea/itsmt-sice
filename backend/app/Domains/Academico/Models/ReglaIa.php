<?php

namespace App\Domains\Academico\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReglaIa extends Model
{
    use HasUuids;

    public const AMBITOS = ['global', 'carrera', 'docente', 'grupo'];

    protected $table = 'reglas_ia';

    protected $fillable = ['ambito', 'referencia_id', 'habilitada', 'nota', 'actualizada_por'];

    protected $casts = ['habilitada' => 'boolean'];

    public function actualizadaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actualizada_por');
    }
}
