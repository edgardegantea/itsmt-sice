<?php

namespace App\Domains\Vinculacion\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class InformeSemestralAsesor extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'informes_semestral_asesor';

    protected $fillable = ['residencia_id', 'asesor_id', 'periodo', 'contenido', 'estatus'];

    public function residencia(): BelongsTo
    {
        return $this->belongsTo(ResidenciaProfesional::class, 'residencia_id');
    }

    public function asesor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'asesor_id');
    }
}
