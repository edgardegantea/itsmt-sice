<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PlanAccionTutorial extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'planes_accion_tutorial';

    protected $fillable = [
        'tutor_id', 'periodo_id', 'objetivo_general',
        'actividades', 'metas', 'estatus',
    ];

    protected $casts = [
        'actividades' => 'array',
        'metas'       => 'array',
    ];

    public function tutor(): BelongsTo
    {
        return $this->belongsTo(Tutor::class);
    }

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class);
    }
}
