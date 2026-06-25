<?php

namespace App\Http\Requests\Admision;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ActualizarAlumnoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasAnyRole(['admin', 'superadmin', 'personal_administrativo']);
    }

    public function rules(): array
    {
        return [
            'estatus'                            => ['sometimes', Rule::in(['activo', 'baja_temporal', 'baja_definitiva', 'egresado', 'titulado'])],
            'semestre_actual'                    => ['sometimes', 'integer', 'min:1', 'max:12'],
            'carrera_id'                         => ['sometimes', 'uuid', 'exists:carreras,id'],
            'pendiente_certificado_bachillerato' => ['sometimes', 'boolean'],
            'plantel'                            => ['sometimes', 'in:martinez_de_la_torre,vega_de_alatorre'],
            'modalidad'                          => ['sometimes', 'in:escolarizado,sabatino'],
            'observaciones_estatus'              => ['sometimes', 'nullable', 'string', 'max:1000'],
        ];
    }
}
