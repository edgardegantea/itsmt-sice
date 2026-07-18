<?php

namespace App\Domains\Investigacion\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IntegranteCa extends Model
{
    use HasUuids;

    protected $table = 'integrantes_ca';

    protected $fillable = [
        'cuerpo_academico_id', 'docente_id', 'rol', 'fecha_ingreso', 'fecha_baja',
    ];

    protected $casts = [
        'fecha_ingreso' => 'date',
        'fecha_baja'    => 'date',
    ];

    public function cuerpoAcademico(): BelongsTo { return $this->belongsTo(CuerpoAcademico::class, 'cuerpo_academico_id'); }
    public function docente(): BelongsTo         { return $this->belongsTo(User::class, 'docente_id'); }
}
