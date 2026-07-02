<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProgramaEstudioEspecialidad extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'programas_estudio_especialidad';

    protected $fillable = ['especialidad_id', 'materia_id', 'semestre', 'obligatoria'];

    protected function casts(): array
    {
        return ['obligatoria' => 'boolean'];
    }

    public function especialidad(): BelongsTo
    {
        return $this->belongsTo(Especialidad::class, 'especialidad_id');
    }

    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class, 'materia_id');
    }
}
