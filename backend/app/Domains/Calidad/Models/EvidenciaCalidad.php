<?php

namespace App\Domains\Calidad\Models;

use App\Domains\Academico\Models\Periodo;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class EvidenciaCalidad extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'evidencias_calidad';

    protected $fillable = [
        'periodo_id', 'proceso', 'indicador', 'tipo_evidencia',
        'archivo_path', 'archivo_nombre', 'descripcion',
        'fecha_evidencia', 'estatus',
        'subido_por', 'validado_por', 'validado_en',
    ];

    protected $casts = [
        'fecha_evidencia' => 'date',
        'validado_en'     => 'datetime',
    ];

    public function periodo(): BelongsTo    { return $this->belongsTo(Periodo::class); }
    public function subidor(): BelongsTo    { return $this->belongsTo(User::class, 'subido_por'); }
    public function validador(): BelongsTo  { return $this->belongsTo(User::class, 'validado_por'); }
}
