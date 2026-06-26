<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Materia extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'carrera_id', 'clave', 'clave_oficial_tecnm', 'nombre', 'semestre',
        'creditos', 'horas_teoria', 'horas_practica', 'tipo', 'activa',
        // Programa TecNM
        'satca', 'caracterizacion', 'intencion_didactica',
        'competencia_especifica', 'competencias_previas',
        'temario', 'fuentes_informacion', 'documento_path',
    ];

    protected function casts(): array
    {
        return [
            'activa'             => 'boolean',
            'temario'            => 'array',
            'fuentes_informacion' => 'array',
        ];
    }

    /** URL pública del documento, o null si no tiene. */
    public function getDocumentoUrlAttribute(): ?string
    {
        return $this->documento_path
            ? Storage::disk('public')->url($this->documento_path)
            : null;
    }

    protected $appends = ['documento_url'];

    public function carrera(): BelongsTo
    {
        return $this->belongsTo(Carrera::class);
    }

    public function cargas(): HasMany
    {
        return $this->hasMany(CargaAcademica::class);
    }
}
