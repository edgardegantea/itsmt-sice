<?php

namespace App\Domains\Finanzas\Models;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Permanencia\Models\Adeudo;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Pago extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'alumno_id', 'adeudo_id', 'periodo_id',
        'monto', 'concepto', 'fecha_pago',
        'metodo_pago', 'folio_cfdi', 'serie_cfdi', 'uuid_cfdi',
        'registrado_por',
    ];

    protected $casts = [
        'monto'      => 'decimal:2',
        'fecha_pago' => 'date',
    ];

    public function alumno(): BelongsTo   { return $this->belongsTo(Alumno::class); }
    public function adeudo(): BelongsTo   { return $this->belongsTo(Adeudo::class); }
    public function periodo(): BelongsTo  { return $this->belongsTo(Periodo::class); }
    public function registrador(): BelongsTo { return $this->belongsTo(User::class, 'registrado_por'); }
}
