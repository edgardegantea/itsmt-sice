<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tutor extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'tutores';

    protected $fillable = ['docente_id', 'activo'];

    protected $casts = ['activo' => 'boolean'];

    public function docente(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'docente_id');
    }

    public function asignaciones(): HasMany
    {
        return $this->hasMany(AsignacionTutoria::class);
    }

    public function sesiones(): HasMany
    {
        return $this->hasMany(SesionTutoria::class);
    }

    public function planes(): HasMany
    {
        return $this->hasMany(PlanAccionTutorial::class);
    }
}
