<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\User;

class InscripcionDistancia extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'inscripciones_distancia';

    protected $fillable = [
        'alumno_id',
        'programa_id',
        'periodo_ingreso_id',
        'carga_trimestral',
        'modulo_competencias_acreditado',
    ];

    protected $casts = [
        'carga_trimestral'               => 'boolean',
        'modulo_competencias_acreditado' => 'boolean',
    ];

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(User::class, 'alumno_id');
    }

    public function programa(): BelongsTo
    {
        return $this->belongsTo(ProgramaDistancia::class, 'programa_id');
    }

    public function periodoIngreso(): BelongsTo
    {
        return $this->belongsTo(Periodo::class, 'periodo_ingreso_id');
    }
}
