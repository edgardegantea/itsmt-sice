<?php

namespace App\Domains\Admision\Models;

use App\Domains\Academico\Models\Carrera;
use App\Domains\Academico\Models\Periodo;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Aspirante extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'numero_ficha',
        'nombres',
        'apellido_paterno',
        'apellido_materno',
        'curp',
        'fecha_nacimiento',
        'sexo',
        'municipio_procedencia',
        'calle',
        'colonia',
        'ciudad',
        'estado_domicilio',
        'codigo_postal',
        'escuela_bachillerato',
        'promedio_bachillerato',
        'turno_preferido',
        'email',
        'telefono',
        'folio_preinscripcion_tecnm',
        'folio_exani',
        'puntaje_exani',
        'carrera_id',
        'periodo_id',
        'estatus',
        'motivo_rechazo',
        'documentos',
        'observaciones',
        'area_bachillerato',
        'estado_civil',
        'medio_enterado',
        'tiene_equipo_computo',
        'campus_preferido',
        'modalidad_preferida',
        'constancia_bachillerato',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $aspirante) {
            if (empty($aspirante->numero_ficha)) {
                $aspirante->numero_ficha = self::generarFicha($aspirante->periodo_id);
            }
        });
    }

    public static function generarFicha(string $periodoId): string
    {
        $anio = now()->format('Y');
        $max  = self::withTrashed()
            ->where('periodo_id', $periodoId)
            ->whereNotNull('numero_ficha')
            ->count();
        return $anio . '-' . str_pad($max + 1, 4, '0', STR_PAD_LEFT);
    }

    protected function casts(): array
    {
        return [
            'documentos'            => 'array',
            'fecha_nacimiento'      => 'date',
            'puntaje_exani'         => 'float',
            'promedio_bachillerato' => 'float',
            'tiene_equipo_computo'  => 'boolean',
        ];
    }

    public function carrera(): BelongsTo
    {
        return $this->belongsTo(Carrera::class);
    }

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class);
    }

    public function inscripcion(): HasOne
    {
        return $this->hasOne(Inscripcion::class);
    }
}
