<?php

namespace App\Domains\Investigacion\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProyectoInvestigacion extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'proyectos_investigacion';

    protected $fillable = [
        'cuerpo_academico_id', 'titulo', 'tipo', 'fuente_financiamiento', 'monto',
        'fecha_inicio', 'fecha_fin', 'estatus', 'responsable_id', 'descripcion',
    ];

    protected $casts = [
        'fecha_inicio' => 'date',
        'fecha_fin'    => 'date',
        'monto'        => 'decimal:2',
    ];

    public function cuerpoAcademico(): BelongsTo { return $this->belongsTo(CuerpoAcademico::class, 'cuerpo_academico_id'); }
    public function responsable(): BelongsTo     { return $this->belongsTo(User::class, 'responsable_id'); }
    public function producciones(): HasMany      { return $this->hasMany(ProduccionAcademica::class, 'proyecto_id'); }
}
