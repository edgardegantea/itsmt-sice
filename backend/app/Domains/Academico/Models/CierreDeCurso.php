<?php

namespace App\Domains\Academico\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CierreDeCurso extends Model
{
    use HasUuids;

    protected $table = 'cierres_de_curso';

    protected $fillable = [
        'grupo_id',
        'periodo_id',
        'cerrado_por',
        'fecha_cierre',
    ];

    protected function casts(): array
    {
        return ['fecha_cierre' => 'datetime'];
    }

    public function grupo(): BelongsTo
    {
        return $this->belongsTo(Grupo::class);
    }

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class);
    }

    public function cerradoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cerrado_por');
    }
}
