<?php

namespace App\Domains\Vinculacion\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class AsesoriaRp extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'asesorias_rp';

    protected $fillable = [
        'residencia_id', 'asesor_interno_id', 'fecha', 'lugar',
        'num_asesoria', 'tipo', 'temas', 'solucion_recomendada', 'firmada',
    ];

    protected $casts = [
        'temas'   => 'array',
        'fecha'   => 'date',
        'firmada' => 'boolean',
    ];

    public function residencia(): BelongsTo
    {
        return $this->belongsTo(ResidenciaProfesional::class, 'residencia_id');
    }

    public function asesorInterno(): BelongsTo
    {
        return $this->belongsTo(User::class, 'asesor_interno_id');
    }
}
