<?php

namespace App\Domains\Academico\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class FuncionPersonal extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'funciones_personal';

    protected $fillable = [
        'user_id', 'funcion', 'area', 'descripcion',
        'fecha_inicio', 'fecha_fin', 'activa',
    ];

    protected function casts(): array
    {
        return [
            'activa'       => 'boolean',
            'fecha_inicio' => 'date',
            'fecha_fin'    => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
