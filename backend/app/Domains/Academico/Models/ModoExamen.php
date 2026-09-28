<?php

namespace App\Domains\Academico\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ModoExamen extends Model
{
    use HasUuids;

    protected $table = 'modos_examen';

    protected $fillable = ['periodo_id', 'fecha', 'activado_por_id'];

    protected function casts(): array
    {
        return ['fecha' => 'date'];
    }

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class);
    }

    public function activadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'activado_por_id');
    }

    public static function activoHoy(?string $fecha = null): bool
    {
        return static::whereDate('fecha', $fecha ?? now()->toDateString())->exists();
    }
}
