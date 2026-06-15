<?php

namespace App\Http\Requests\Admision;

use Illuminate\Foundation\Http\FormRequest;

class InscribirAspiranteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'aspirante_id' => ['required', 'uuid', 'exists:aspirantes,id'],
            'tipo_ingreso' => ['nullable', 'in:nuevo_ingreso,reingreso,traslado,equivalencia'],
        ];
    }
}
