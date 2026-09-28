<?php

namespace App\Domains\Seguridad\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ApiKey extends Model
{
    use HasUuids;

    protected $table = 'api_keys';

    protected $fillable = ['nombre', 'key_hash', 'key_prefix', 'creado_por_id', 'activa', 'ultimo_uso_en'];

    protected function casts(): array
    {
        return ['activa' => 'boolean', 'ultimo_uso_en' => 'datetime'];
    }

    public function creadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creado_por_id');
    }

    /**
     * Genera una llave nueva (se muestra en claro UNA sola vez al crearla) y
     * devuelve tanto el modelo persistido como el valor en claro para mostrarlo.
     */
    public static function generar(string $nombre, string $creadoPorId): array
    {
        $llave = 'sice_' . Str::random(40);

        $modelo = static::create([
            'nombre'        => $nombre,
            'key_hash'      => hash('sha256', $llave),
            'key_prefix'    => substr($llave, 0, 12),
            'creado_por_id' => $creadoPorId,
        ]);

        return [$modelo, $llave];
    }

    public static function validar(string $llave): ?self
    {
        return static::where('key_hash', hash('sha256', $llave))->where('activa', true)->first();
    }
}
