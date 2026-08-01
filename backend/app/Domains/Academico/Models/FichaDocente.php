<?php

namespace App\Domains\Academico\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class FichaDocente extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'fichas_docentes';

    protected $fillable = [
        'docente_id',
        'tipo_contrato',
        'categoria',
        'especialidades',
        'fecha_ingreso',
        'titulos_academicos',
        'horas_frente_grupo_por_periodo',
        'activo',
        // Campos de CV — mantenidos por el propio docente
        'semblanza',
        'experiencia_laboral',
        'cursos_capacitacion',
        'publicaciones',
        'cv_actualizado_en',
    ];

    protected $casts = [
        'especialidades'               => 'array',
        'titulos_academicos'           => 'array',
        'horas_frente_grupo_por_periodo' => 'array',
        'experiencia_laboral'          => 'array',
        'cursos_capacitacion'          => 'array',
        'publicaciones'                => 'array',
        'fecha_ingreso'                => 'date',
        'cv_actualizado_en'            => 'datetime',
        'activo'                       => 'boolean',
    ];

    public function docente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'docente_id');
    }
}
