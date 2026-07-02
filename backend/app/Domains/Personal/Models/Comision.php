<?php

namespace App\Domains\Personal\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Comision extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'comisiones';

    protected $fillable = [
        'personal_id', 'destino', 'proposito',
        'fecha_inicio', 'fecha_fin',
        'con_viaticos', 'monto_viaticos',
        'asignada_por', 'url_oficio',
    ];

    protected function casts(): array
    {
        return [
            'fecha_inicio'  => 'date',
            'fecha_fin'     => 'date',
            'con_viaticos'  => 'boolean',
            'monto_viaticos'=> 'decimal:2',
        ];
    }

    public function personal(): BelongsTo
    {
        return $this->belongsTo(User::class, 'personal_id');
    }

    public function asignadaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'asignada_por');
    }
}
