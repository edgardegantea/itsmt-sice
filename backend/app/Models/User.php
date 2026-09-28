<?php

namespace App\Models;

use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\FichaDocente;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, HasUuids, Notifiable {
        // Los traits se "aplanan" dentro de la clase — a diferencia de un método heredado
        // de una clase padre, el hasAnyRole() de HasRoles NO es alcanzable con parent::.
        // Se conserva accesible con un alias para que el override de abajo pueda llamar a
        // la implementación original de Spatie en el caso no-superadmin.
        HasRoles::hasAnyRole as private traitHasAnyRole;
    }

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
        'curp',
        'rfc',
        'fecha_nacimiento',
        'sexo',
        'estado_civil',
        'direccion',
        'telefono',
        'contacto_emergencia_nombre',
        'contacto_emergencia_telefono',
        'foto_path',
        'recordatorio_asistencia_activo',
        'activo',
    ];

    protected $appends = ['foto_url'];

    /** URL pública de la foto de perfil, o null si no tiene. */
    public function getFotoUrlAttribute(): ?string
    {
        return $this->foto_path
            ? Storage::disk('public')->url($this->foto_path)
            : null;
    }

    public function carrera(): BelongsTo
    {
        return $this->belongsTo(Carrera::class);
    }

    /**
     * Carreras a las que un docente está asignado (muchos-a-muchos).
     * Independiente de `carrera_id` (usado exclusivamente para restringir a
     * jefe_carrera a una única carrera vía carreraRestringida()).
     */
    public function carreras(): BelongsToMany
    {
        return $this->belongsToMany(Carrera::class, 'docente_carrera', 'docente_id', 'carrera_id')
            ->withPivot('horas_asignadas')
            ->withTimestamps();
    }

    /** Local scope: filtra usuarios (docentes) asignados a una carrera dada vía la relación muchos-a-muchos. */
    public function scopeDeCarrera($query, string $carreraId)
    {
        return $query->whereHas('carreras', fn($q) => $q->where('carreras.id', $carreraId));
    }

    public function cargas(): HasMany
    {
        return $this->hasMany(CargaAcademica::class, 'docente_id');
    }

    public function fichaDocente(): HasOne
    {
        return $this->hasOne(FichaDocente::class, 'docente_id');
    }

    /** Devuelve el carrera_id si el usuario es jefe_carrera, null en caso contrario. */
    public function carreraRestringida(): ?string
    {
        return $this->hasRole('jefe_carrera') ? $this->carrera_id : null;
    }

    /** Chequeo directo contra la relación, sin pasar por hasRole()/hasAnyRole() — evita
     * recursión y no altera el significado de hasRole() como chequeo de identidad (varios
     * lugares usan `hasRole('jefe_carrera')` para decidir si aplicar una restricción de
     * carrera, y ahí sí debe responder según el rol real, no según el nivel de acceso). */
    private function tieneRolSuperadmin(): bool
    {
        $this->loadMissing('roles');
        return $this->roles->contains('name', 'superadmin');
    }

    /**
     * El superadmin es el rol de más alto nivel y no debe toparse con ninguna restricción
     * de autorización en el sistema. Los checks de Gate/Policy ya lo saltan vía Gate::before
     * (ver AppServiceProvider), pero la mayoría de los endpoints de esta app autorizan con
     * `hasAnyRole([...])` directo en el controlador (no con Policies), que Gate::before no
     * intercepta. Sobrescribir hasAnyRole() aquí es un único punto central que garantiza
     * acceso total del superadmin a cualquier endpoint sin auditar cada controlador uno por
     * uno — deliberadamente NO se sobrescribe hasRole() (singular): ese método se usa en
     * varios lugares para decidir identidad/comportamiento (p. ej. `carreraRestringida()`
     * o ramas if/elseif por rol), no solo para permitir/denegar, y alterarlo ahí metería al
     * superadmin en ramas de lógica que no le corresponden (como el acotamiento por carrera
     * de jefe_carrera).
     */
    public function hasAnyRole(...$roles): bool
    {
        if ($this->tieneRolSuperadmin()) {
            return true;
        }
        return $this->traitHasAnyRole(...$roles);
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
            'fecha_nacimiento'  => 'date',
            'recordatorio_asistencia_activo' => 'boolean',
            'activo'            => 'boolean',
        ];
    }
}
