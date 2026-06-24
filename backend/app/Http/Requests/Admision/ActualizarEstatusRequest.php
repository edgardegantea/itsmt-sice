<?php

namespace App\Http\Requests\Admision;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ActualizarEstatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasAnyRole(['admin', 'superadmin', 'personal_administrativo']);
    }

    public function rules(): array
    {
        return [
            'estatus'         => ['required', Rule::in(['pendiente', 'aceptado', 'rechazado'])],
            'observaciones'   => ['nullable', 'string', 'max:500'],
            'motivo_rechazo'  => [Rule::requiredIf(fn () => $this->input('estatus') === 'rechazado'), 'nullable', 'string', 'max:500'],
        ];
    }
}
