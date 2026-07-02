<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\User;
use App\Domains\Institucional\Models\DirectorioArea;

class FichaSindical extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'fichas_sindicales';

    protected $fillable = [
        'docente_id',
        'clave_plaza',
        'tipo_nombramiento',
        'categoria_tbc',
        'nivel_tbc',
        'numero_issste',
        'fecha_ingreso_sep',
        'fecha_ingreso_tecnm',
        'anios_servicio',
        'departamento_id',
        'activo',
    ];

    protected $casts = [
        'fecha_ingreso_sep'   => 'date',
        'fecha_ingreso_tecnm' => 'date',
        'activo'              => 'boolean',
        'anios_servicio'      => 'integer',
    ];

    public function docente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'docente_id');
    }

    public function departamento(): BelongsTo
    {
        return $this->belongsTo(DirectorioArea::class, 'departamento_id');
    }

    public function movimientos(): HasMany
    {
        return $this->hasMany(MovimientoPlaza::class, 'ficha_sindical_id')->orderBy('fecha_efectiva');
    }
}
