<?php

namespace App\Domains\Investigacion\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Lgac extends Model
{
    use HasUuids;

    protected $table = 'lgac';

    protected $fillable = ['cuerpo_academico_id', 'nombre', 'descripcion'];

    public function cuerpoAcademico(): BelongsTo { return $this->belongsTo(CuerpoAcademico::class, 'cuerpo_academico_id'); }
}
