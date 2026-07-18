<?php

namespace App\Domains\Investigacion\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CuerpoAcademico extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'cuerpos_academicos';

    protected $fillable = [
        'nombre', 'clave', 'lgac_principal', 'grado_consolidacion',
        'fecha_registro', 'fecha_vigencia', 'lider_id', 'activo',
    ];

    protected $casts = [
        'fecha_registro' => 'date',
        'fecha_vigencia' => 'date',
        'activo'         => 'boolean',
    ];

    public function lider(): BelongsTo       { return $this->belongsTo(User::class, 'lider_id'); }
    public function lgacs(): HasMany         { return $this->hasMany(Lgac::class, 'cuerpo_academico_id'); }
    public function integrantes(): HasMany   { return $this->hasMany(IntegranteCa::class, 'cuerpo_academico_id'); }
    public function proyectos(): HasMany     { return $this->hasMany(ProyectoInvestigacion::class, 'cuerpo_academico_id'); }
    public function producciones(): HasMany  { return $this->hasMany(ProduccionAcademica::class, 'cuerpo_academico_id'); }
}
