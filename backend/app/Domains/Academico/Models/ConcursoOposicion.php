<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\User;

class ConcursoOposicion extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'concursos_oposicion';

    protected $fillable = [
        'nombre',
        'fecha_realizacion',
        'descripcion',
        'convocado_por',
    ];

    protected $casts = [
        'fecha_realizacion' => 'date',
    ];

    public function convocadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'convocado_por');
    }

    public function participantes(): HasMany
    {
        return $this->hasMany(ParticipanteConcurso::class, 'concurso_id');
    }
}
