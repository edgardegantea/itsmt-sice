<?php

namespace App\Domains\Academico\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActaCalificaciones extends Model
{
    use HasUuids;

    protected $table = 'actas_calificaciones';

    protected $fillable = [
        'grupo_id',
        'periodo_id',
        'docente_id',
        'url_pdf',
        'firmada',
        'fecha_firma',
        'firmada_por',
        'integrada_libro_actas',
    ];

    protected function casts(): array
    {
        return [
            'firmada'               => 'boolean',
            'integrada_libro_actas' => 'boolean',
            'fecha_firma'           => 'date',
        ];
    }

    public function grupo(): BelongsTo
    {
        return $this->belongsTo(Grupo::class);
    }

    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class);
    }

    public function docente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'docente_id');
    }

    public function firmadaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'firmada_por');
    }
}
