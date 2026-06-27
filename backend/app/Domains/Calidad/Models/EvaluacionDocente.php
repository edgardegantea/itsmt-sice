<?php

namespace App\Domains\Calidad\Models;

use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\Periodo;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Sin FK a alumno para garantizar anonimato (TecNM Art. 7 fracción VIII)
class EvaluacionDocente extends Model
{
    use HasUuids;

    protected $table = 'evaluaciones_docentes';

    public $timestamps = false;

    protected $fillable = [
        'grupo_id',
        'periodo_id',
        'respuestas',
        'enviada',
    ];

    protected $casts = [
        'respuestas' => 'array',
        'enviada'    => 'boolean',
        'created_at' => 'datetime',
    ];

    public function grupo(): BelongsTo
    {
        return $this->belongsTo(Grupo::class);
    }

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class);
    }
}
