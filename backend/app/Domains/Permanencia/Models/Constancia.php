<?php

namespace App\Domains\Permanencia\Models;

use App\Domains\Academico\Models\Alumno;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Constancia extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'constancias';

    protected $fillable = [
        'alumno_id',
        'tipo',
        'folio_unico',
        'url_pdf',
        'estatus',
        'solicitada_por',
        'emitida_por',
        'emitida_en',
    ];

    protected $casts = [
        'emitida_en' => 'datetime',
    ];

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(Alumno::class);
    }

    public function solicitadaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'solicitada_por');
    }

    public function emitidaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'emitida_por');
    }

    public static function generarFolio(string $tipo): string
    {
        $prefijos = ['estudios' => 'CE', 'inscripcion' => 'CI', 'calificaciones' => 'CC'];
        $prefijo  = $prefijos[$tipo] ?? 'CX';
        $año      = now()->format('Y');
        $seq      = static::whereYear('created_at', $año)->where('tipo', $tipo)->count() + 1;

        return sprintf('%s-%s-%05d', $prefijo, $año, $seq);
    }
}
