<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Aula extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = ['nombre', 'capacidad', 'tipo', 'activa'];

    protected $casts = ['activa' => 'boolean', 'capacidad' => 'integer'];

    public function cargas(): HasMany
    {
        return $this->hasMany(CargaAcademica::class);
    }
}
