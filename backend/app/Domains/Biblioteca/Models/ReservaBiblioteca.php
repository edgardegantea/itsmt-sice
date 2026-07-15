<?php

namespace App\Domains\Biblioteca\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ReservaBiblioteca extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'reservas_biblioteca';

    protected $fillable = [
        'acervo_id', 'user_id', 'estatus', 'fecha_expiracion',
    ];

    protected $casts = [
        'fecha_expiracion' => 'date',
    ];

    public function acervo(): BelongsTo  { return $this->belongsTo(Acervo::class); }
    public function usuario(): BelongsTo { return $this->belongsTo(User::class, 'user_id'); }
}
