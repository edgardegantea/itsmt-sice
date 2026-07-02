<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Equivalencia extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'equivalencias';

    protected $fillable = [
        'alumno_id', 'institucion_origen', 'materias_json',
        'dictamen_url', 'validado_por',
    ];

    protected $casts = [
        'materias_json' => 'array',
    ];

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'alumno_id');
    }

    public function validadoPor(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'validado_por');
    }
}
