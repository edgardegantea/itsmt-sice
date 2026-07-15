<?php

namespace App\Domains\Academico\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class DiaNoLaborable extends Model
{
    use HasUuids;

    protected $table = 'dias_no_laborables';

    protected $fillable = ['fecha', 'descripcion'];

    protected function casts(): array
    {
        return ['fecha' => 'date'];
    }
}
