<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PostulacionBolsaTrabajo extends Model
{
    use HasUuids;

    protected $table = 'postulaciones_bolsa_trabajo';

    protected $fillable = [
        'vacante_id', 'egresado_id', 'fecha_postulacion', 'estatus', 'notas',
    ];

    protected $casts = [
        'fecha_postulacion' => 'date',
    ];

    public function vacante(): BelongsTo  { return $this->belongsTo(VacanteBolsaTrabajo::class, 'vacante_id'); }
    public function egresado(): BelongsTo { return $this->belongsTo(Egresado::class, 'egresado_id'); }
}
