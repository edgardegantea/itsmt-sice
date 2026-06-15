<?php

namespace App\Domains\Permanencia\Models;

use App\Domains\Academico\Models\Alumno;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Adeudo extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'adeudos';

    protected $fillable = [
        'alumno_id',
        'concepto',
        'monto',
        'pagado',
    ];

    protected $casts = [
        'monto'  => 'decimal:2',
        'pagado' => 'boolean',
    ];

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(Alumno::class);
    }
}
