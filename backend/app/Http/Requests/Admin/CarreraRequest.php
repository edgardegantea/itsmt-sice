<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CarreraRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('admin') ?? false;
    }

    public function rules(): array
    {
        $carreraId = $this->route('carrera')?->id;

        return [
            'nombre'      => ['required', 'string', 'max:150'],
            'clave'       => ['required', 'string', 'max:10', Rule::unique('carreras', 'clave')->ignore($carreraId)],
            'codigo_it'   => ['required', 'string', 'max:3', 'regex:/^\d{2,3}$/'],
            'plan_clave'  => ['nullable', 'string', 'max:20'],
            'especialidad'=> ['nullable', 'string', 'max:100'],
            'activa'      => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required'    => 'El nombre de la carrera es obligatorio.',
            'clave.required'     => 'La clave de la carrera es obligatoria.',
            'clave.unique'       => 'Esta clave ya está en uso por otra carrera.',
            'codigo_it.required' => 'El código TecNM es obligatorio.',
            'codigo_it.regex'    => 'El código TecNM debe ser un número de 2 o 3 dígitos.',
        ];
    }
}
