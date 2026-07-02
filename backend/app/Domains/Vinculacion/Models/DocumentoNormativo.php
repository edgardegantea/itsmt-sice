<?php

namespace App\Domains\Vinculacion\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class DocumentoNormativo extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'documentos_normativos';

    protected $fillable = [
        'entidad_type', 'entidad_id', 'tipo_documento',
        'url_archivo', 'validado', 'validado_por',
    ];

    protected $casts = [
        'validado' => 'boolean',
    ];

    public function entidad(): MorphTo
    {
        return $this->morphTo();
    }

    public function validadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validado_por');
    }
}
