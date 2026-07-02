<?php

namespace App\Domains\Convocatoria\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\User;

class Convocatoria extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'convocatorias';

    protected $fillable = [
        'titulo',
        'descripcion',
        'tipo',
        'audiencia',
        'fecha_apertura',
        'fecha_limite',
        'cupo_maximo',
        'estatus',
        'publicada_por',
    ];

    protected $casts = [
        'audiencia'      => 'array',
        'fecha_apertura' => 'date',
        'fecha_limite'   => 'date',
        'cupo_maximo'    => 'integer',
    ];

    public function publicadaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'publicada_por');
    }

    public function requisitos(): HasMany
    {
        return $this->hasMany(RequisitoConvocatoria::class, 'convocatoria_id');
    }

    public function postulaciones(): HasMany
    {
        return $this->hasMany(Postulacion::class, 'convocatoria_id');
    }
}
