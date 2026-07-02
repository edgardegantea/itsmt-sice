<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProgramaDistancia extends Model
{
    use HasUuids;

    protected $table = 'programas_distancia';

    protected $fillable = [
        'carrera_id',
        'modalidad',
        'creditos_minimos_carga',
        'creditos_maximos_carga',
        'semestres_maximos',
        'permite_trimestral',
        'activo',
    ];

    protected $casts = [
        'creditos_minimos_carga' => 'integer',
        'creditos_maximos_carga' => 'integer',
        'semestres_maximos'      => 'integer',
        'permite_trimestral'     => 'boolean',
        'activo'                 => 'boolean',
    ];

    public function carrera(): BelongsTo
    {
        return $this->belongsTo(Carrera::class);
    }

    public function inscripciones(): HasMany
    {
        return $this->hasMany(InscripcionDistancia::class, 'programa_id');
    }
}
