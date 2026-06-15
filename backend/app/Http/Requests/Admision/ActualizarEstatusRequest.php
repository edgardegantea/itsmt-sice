<?php

namespace App\Http\Requests\Admision;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ActualizarEstatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole(['admin', 'personal_administrativo']);
    }

    public function rules(): array
    {
        return [
            'estatus'         => ['required', Rule::in(['pendiente', 'aceptado', 'rechazado'])],
            'observaciones'   => ['nullable', 'string', 'max:500'],
            'motivo_rechazo'  => ['nullable', 'string', 'max:500'],
        ];
    }
}
