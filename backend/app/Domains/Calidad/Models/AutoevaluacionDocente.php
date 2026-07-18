<?php

namespace App\Domains\Calidad\Models;

use App\Domains\Academico\Models\Periodo;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class AutoevaluacionDocente extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'autoevaluaciones_docente';

    protected $fillable = ['docente_id', 'periodo_id', 'estatus'];

    public function docente(): BelongsTo { return $this->belongsTo(User::class, 'docente_id'); }
    public function periodo(): BelongsTo { return $this->belongsTo(Periodo::class); }
}
