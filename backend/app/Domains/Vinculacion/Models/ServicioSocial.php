<?php

namespace App\Domains\Vinculacion\Models;

use App\Domains\Academico\Models\Alumno;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ServicioSocial extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'servicio_social';

    protected $fillable = [
        'alumno_id', 'empresa', 'responsable', 'fecha_inicio', 'fecha_fin',
        'estatus', 'horas_acumuladas', 'nivel_desempeno', 'creditos_otorgados', 'documentos',
    ];

    protected $casts = [
        'documentos'       => 'array',
        'fecha_inicio'     => 'date',
        'fecha_fin'        => 'date',
        'horas_acumuladas' => 'integer',
        'creditos_otorgados' => 'integer',
    ];

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(Alumno::class);
    }
}
