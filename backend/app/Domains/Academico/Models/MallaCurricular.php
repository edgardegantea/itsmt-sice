<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MallaCurricular extends Model
{
    use HasUuids;

    protected $table = 'mallas_curriculares';

    protected $fillable = ['carrera_id', 'materia_id', 'semestre', 'es_especialidad'];

    protected $casts = ['es_especialidad' => 'boolean', 'semestre' => 'integer'];

    public function carrera(): BelongsTo
    {
        return $this->belongsTo(Carrera::class);
    }

    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class);
    }
}
