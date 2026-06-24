<?php

namespace App\Domains\Admision\Models;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Periodo;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Inscripcion extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'inscripciones';

    protected $fillable = [
        'aspirante_id',
        'numero_control',
        'carrera_id',
        'periodo_id',
        'tipo_ingreso',
        'tipo_ingreso_registro',
        'semestre_ingreso',
        'fecha_inscripcion',
        'inscrito_por',
        'carta_compromiso_generada',
        'solicitud_inscripcion_generada',
        'contrato_generado',
        'carta_compromiso_docs_generada',
    ];

    protected function casts(): array
    {
        return [
            'fecha_inscripcion'              => 'date',
            'carta_compromiso_generada'      => 'boolean',
            'solicitud_inscripcion_generada' => 'boolean',
            'contrato_generado'              => 'boolean',
            'carta_compromiso_docs_generada' => 'boolean',
        ];
    }

    public function aspirante(): BelongsTo
    {
        return $this->belongsTo(Aspirante::class);
    }

    public function carrera(): BelongsTo
    {
        return $this->belongsTo(Carrera::class);
    }

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class);
    }

    public function inscritoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inscrito_por');
    }

    public function alumno(): HasOne
    {
        return $this->hasOne(Alumno::class);
    }
}
