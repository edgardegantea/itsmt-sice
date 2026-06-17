<?php

namespace App\Http\Requests\Admision;

use Illuminate\Foundation\Http\FormRequest;

class RegistrarCobroRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['superadmin', 'admin', 'personal_administrativo']) ?? false;
    }

    public function rules(): array
    {
        return [
            'inscripcion_id'         => ['required', 'uuid', 'exists:inscripciones,id'],
            'alumno_id'              => ['required', 'uuid', 'exists:alumnos,id'],
            'folio_fiscal'           => ['required', 'string', 'max:36', 'unique:recibos_cobro,folio_fiscal'],
            'rfc_emisor'             => ['sometimes', 'string', 'max:13'],
            'nombre_pagador'         => ['required', 'string', 'max:200'],
            'rfc_pagador'            => ['nullable', 'string', 'max:13'],
            'concepto'               => ['required', 'string', 'max:300'],
            'importe'                => ['required', 'numeric', 'min:0.01'],
            'sello_digital_cfdi'     => ['nullable', 'string'],
            'numero_certificado_sat' => ['nullable', 'string', 'max:40'],
        ];
    }
}
