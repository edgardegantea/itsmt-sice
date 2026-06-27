<?php

namespace App\Models;

use App\Domains\Academico\Models\Carrera;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, HasUuids, Notifiable;

    protected string $guard_name = 'web';

    /** Roles con acceso total de lectura/escritura pero sin capacidad de eliminar. */
    public const ROLES_DIRECTIVOS = [
        'control_escolar',
        'direccion_general',
        'direccion_academica',
        'subdireccion_academica',
    ];

    /** True si el usuario puede leer y escribir (pero no necesariamente eliminar). */
    public function puedeGestionar(): bool
    {
        return $this->hasAnyRole([
            'superadmin', 'admin',
            ...self::ROLES_DIRECTIVOS,
        ]);
    }

    /** True si el usuario puede eliminar registros. */
    public function puedeEliminar(): bool
    {
        return $this->hasAnyRole(['superadmin', 'admin']);
    }

    protected $fillable = [
        'name',
        'email',
        'password',
        'carrera_id',
        'clave_empleado',
        'no_huella',
        'nombramiento',
        'tipo_horas',
    ];

    public function carrera(): BelongsTo
    {
        return $this->belongsTo(Carrera::class);
    }

    /** Devuelve el carrera_id si el usuario es jefe_carrera, null en caso contrario. */
    public function carreraRestringida(): ?string
    {
        return $this->hasRole('jefe_carrera') ? $this->carrera_id : null;
    }

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
        ];
    }
}
