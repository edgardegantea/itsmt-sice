<?php

namespace App\Http\Requests\Admision;

use Illuminate\Foundation\Http\FormRequest;

class AutorizacionExpedienteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'autorizacion_consulta_expediente' => ['required', 'in:padre,madre,ambos,tutor,otro,nadie'],
        ];
    }
}
