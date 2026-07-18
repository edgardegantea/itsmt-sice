<?php

namespace App\Domains\Infraestructura\Models;

use App\Domains\Academico\Models\Aula;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ReservaEspacio extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'reservas_espacios';

    protected $fillable = [
        'aula_id', 'solicitante_id', 'fecha', 'hora_inicio', 'hora_fin',
        'motivo', 'estatus', 'aprobado_por',
    ];

    protected $casts = [
        'fecha' => 'date',
    ];

    public function aula(): BelongsTo        { return $this->belongsTo(Aula::class); }
    public function solicitante(): BelongsTo { return $this->belongsTo(User::class, 'solicitante_id'); }
    public function aprobador(): BelongsTo   { return $this->belongsTo(User::class, 'aprobado_por'); }
}
