<?php

namespace App\Domains\Academico\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class InstrumentacionDidactica extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'instrumentaciones_didacticas';

    protected $fillable = [
        'asignacion_id', 'periodo_id',
        'objetivo_general', 'competencias', 'unidades', 'metodologia',
        'criterios_evaluacion', 'bibliografia',
        'estatus', 'observaciones_jefe', 'liberada_por', 'visto_bueno_por',
    ];

    protected function casts(): array
    {
        return [
            'competencias'         => 'array',
            'unidades'             => 'array',
            'criterios_evaluacion' => 'array',
        ];
    }

    public function asignacion(): BelongsTo
    {
        return $this->belongsTo(AsignacionDocente::class, 'asignacion_id');
    }

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class);
    }

    public function liberadaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'liberada_por');
    }

    public function vistoBuenoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'visto_bueno_por');
    }
}
