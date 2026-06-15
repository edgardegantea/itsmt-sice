<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class PeriodoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('admin') ?? false;
    }

    public function rules(): array
    {
        return [
            'nombre'                      => ['required', 'string', 'max:50'],
            'tipo'                        => ['required', 'in:regular,intensivo'],
            'fecha_inicio'                => ['required', 'date'],
            'fecha_fin'                   => ['required', 'date', 'after:fecha_inicio'],
            'activo'                      => ['sometimes', 'boolean'],
            'fecha_limite_baja_parcial'   => ['nullable', 'date', 'after:fecha_inicio', 'before:fecha_fin'],
            'fecha_limite_baja_temporal'  => ['nullable', 'date', 'after:fecha_inicio', 'before:fecha_fin'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required'          => 'El nombre del periodo es obligatorio.',
            'tipo.required'            => 'El tipo de periodo es obligatorio.',
            'tipo.in'                  => 'El tipo debe ser "regular" o "intensivo".',
            'fecha_inicio.required'    => 'La fecha de inicio es obligatoria.',
            'fecha_fin.required'       => 'La fecha de fin es obligatoria.',
            'fecha_fin.after'          => 'La fecha de fin debe ser posterior a la fecha de inicio.',
        ];
    }
}
