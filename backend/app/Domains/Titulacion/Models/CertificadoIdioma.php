<?php

namespace App\Domains\Titulacion\Models;

use App\Domains\Academico\Models\Alumno;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class CertificadoIdioma extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'certificados_idioma';

    protected $fillable = [
        'alumno_id', 'idioma', 'nivel', 'institucion_certificadora',
        'fecha_expedicion', 'fecha_vencimiento', 'url_documento',
        'validado', 'validado_por',
    ];

    protected $casts = [
        'fecha_expedicion'   => 'date',
        'fecha_vencimiento'  => 'date',
        'validado'           => 'boolean',
    ];

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(Alumno::class);
    }

    public function validadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validado_por');
    }
}
