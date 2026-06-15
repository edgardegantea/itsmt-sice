<?php

namespace App\Domains\Academico\Models;

use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Models\Inscripcion;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Carrera extends Model
{
    use HasUuids;

    protected $fillable = ['nombre', 'clave', 'codigo_it', 'plan_clave', 'especialidad', 'coordinador_id', 'activa'];

    protected function casts(): array
    {
        return ['activa' => 'boolean'];
    }

    public function coordinador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'coordinador_id');
    }

    public function aspirantes(): HasMany
    {
        return $this->hasMany(Aspirante::class);
    }

    public function inscripciones(): HasMany
    {
        return $this->hasMany(Inscripcion::class);
    }

    public function alumnos(): HasMany
    {
        return $this->hasMany(Alumno::class);
    }
}
