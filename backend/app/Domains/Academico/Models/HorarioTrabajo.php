<?php

namespace App\Domains\Academico\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class HorarioTrabajo extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'horarios_trabajo';

    protected $fillable = [
        'docente_id', 'periodo_id', 'carga_academica_json', 'apoyo_docencia_json',
        'actividades_admin_json', 'total_horas_semanales', 'cct_docente',
        'tipo_nombramiento', 'fecha_ingreso_sep', 'url_pdf',
    ];

    protected $casts = [
        'carga_academica_json'  => 'array',
        'apoyo_docencia_json'   => 'array',
        'actividades_admin_json'=> 'array',
        'fecha_ingreso_sep'     => 'date',
        'total_horas_semanales' => 'integer',
    ];

    public function docente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'docente_id');
    }

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class);
    }
}
