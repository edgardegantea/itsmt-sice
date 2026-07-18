<?php

namespace App\Domains\Investigacion\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProduccionAcademica extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'producciones_academicas';

    protected $fillable = [
        'proyecto_id', 'cuerpo_academico_id', 'tipo', 'titulo', 'autor_principal_id',
        'coautores', 'medio_difusion', 'fecha_publicacion', 'doi_isbn', 'archivo_path', 'estatus',
    ];

    protected $casts = [
        'fecha_publicacion' => 'date',
    ];

    public function proyecto(): BelongsTo       { return $this->belongsTo(ProyectoInvestigacion::class, 'proyecto_id'); }
    public function cuerpoAcademico(): BelongsTo{ return $this->belongsTo(CuerpoAcademico::class, 'cuerpo_academico_id'); }
    public function autorPrincipal(): BelongsTo { return $this->belongsTo(User::class, 'autor_principal_id'); }
}
