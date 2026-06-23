<?php

namespace App\Http\Requests\Admision;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ActualizarAspiranteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole(['admin', 'superadmin', 'personal_administrativo']);
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('curp')) {
            $this->merge(['curp' => strtoupper(trim($this->curp))]);
        }
    }

    public function rules(): array
    {
        $id = $this->route('aspirante')->id;

        return [
            'nombres'               => ['sometimes', 'string', 'max:100'],
            'apellido_paterno'      => ['sometimes', 'string', 'max:100'],
            'apellido_materno'      => ['sometimes', 'nullable', 'string', 'max:100'],
            'curp'                  => ['sometimes', 'string', 'size:18', 'regex:/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/', Rule::unique('aspirantes', 'curp')->ignore($id)],
            'fecha_nacimiento'      => ['sometimes', 'date', 'before:today'],
            'sexo'                  => ['sometimes', 'in:masculino,femenino'],
            'municipio_procedencia' => ['sometimes', 'string', 'max:120'],
            'escuela_bachillerato'  => ['sometimes', 'string', 'max:200'],
            'promedio_bachillerato' => ['sometimes', 'numeric', 'min:6', 'max:10'],
            'turno_preferido'       => ['sometimes', 'in:matutino,vespertino'],
            'email'                 => ['sometimes', 'email', Rule::unique('aspirantes', 'email')->ignore($id)],
            'telefono'              => ['sometimes', 'nullable', 'string', 'max:15'],
            'folio_preinscripcion_tecnm' => ['sometimes', 'nullable', 'string', 'max:50'],
            'folio_exani'           => ['sometimes', 'nullable', 'string', 'max:50'],
            'puntaje_exani'         => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:1000'],
            'carrera_id'            => ['sometimes', 'uuid', 'exists:carreras,id'],
            'periodo_id'            => ['sometimes', 'uuid', 'exists:periodos,id'],
            'observaciones'         => ['sometimes', 'nullable', 'string', 'max:1000'],
        ];
    }
}
