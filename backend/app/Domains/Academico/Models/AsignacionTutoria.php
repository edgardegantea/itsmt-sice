<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class AsignacionTutoria extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'asignaciones_tutoria';

    protected $fillable = ['tutor_id', 'alumno_id', 'periodo_id', 'activa'];

    protected $casts = ['activa' => 'boolean'];

    public function tutor(): BelongsTo
    {
        return $this->belongsTo(Tutor::class);
    }

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'alumno_id');
    }

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class);
    }
}
