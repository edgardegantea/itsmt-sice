<?php

namespace App\Http\Requests\Admision;

use Illuminate\Foundation\Http\FormRequest;

class RegistrarAspiranteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // endpoint público
    }

    public function rules(): array
    {
        return [
            // Datos personales
            'nombres'               => ['required', 'string', 'max:100'],
            'apellido_paterno'      => ['required', 'string', 'max:100'],
            'apellido_materno'      => ['nullable', 'string', 'max:100'],
            'curp'                  => ['required', 'string', 'size:18', 'unique:aspirantes,curp', 'regex:/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/'],
            'fecha_nacimiento'      => ['required', 'date', 'before:today'],
            'sexo'                  => ['required', 'in:masculino,femenino'],
            'municipio_procedencia'  => ['required', 'string', 'max:120'],
            // Domicilio
            'calle'                  => ['nullable', 'string', 'max:150'],
            'colonia'                => ['nullable', 'string', 'max:100'],
            'ciudad'                 => ['nullable', 'string', 'max:100'],
            'estado_domicilio'       => ['nullable', 'string', 'max:80'],
            'codigo_postal'          => ['nullable', 'string', 'max:6'],
            'escuela_bachillerato'  => ['required', 'string', 'max:200'],
            'promedio_bachillerato' => ['required', 'numeric', 'min:6', 'max:10'],
            'turno_preferido'       => ['required', 'string', 'max:30'],
            // Contacto
            'email'                 => ['required', 'email', 'unique:aspirantes,email'],
            'telefono'              => ['nullable', 'string', 'max:15', 'regex:/^\d{10}$/'],
            // Preinscripción TecNM (opcionales — se mantienen en BD pero no se muestran en el formulario público)
            'folio_preinscripcion_tecnm' => ['nullable', 'string', 'max:50'],
            'folio_exani'           => ['nullable', 'string', 'max:50'],
            'puntaje_exani'         => ['nullable', 'numeric', 'min:0', 'max:1000'],
            // Relaciones
            'carrera_id'            => ['required', 'uuid', 'exists:carreras,id'],
            'periodo_id'            => ['required', 'uuid', 'exists:periodos,id'],
            'documentos'            => ['nullable', 'array'],
            // Campos adicionales de admisión
            'area_bachillerato'     => ['required', 'string', 'max:60'],
            'estado_civil'          => ['required', 'string', 'max:30'],
            'medio_enterado'        => ['required', 'string', 'max:80'],
            'tiene_equipo_computo'  => ['required', 'boolean'],
            'campus_preferido'      => ['nullable', 'string', 'max:40'],
            'modalidad_preferida'   => ['nullable', 'string', 'max:20'],
            // Archivo de constancia (multipart/form-data)
            'constancia_bachillerato' => ['required', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png,webp'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombres.required'               => 'El nombre es obligatorio.',
            'apellido_paterno.required'      => 'El apellido paterno es obligatorio.',
            'curp.required'                  => 'La CURP es obligatoria.',
            'curp.size'                      => 'La CURP debe tener exactamente 18 caracteres.',
            'curp.unique'                    => 'Esta CURP ya está registrada en el sistema.',
            'curp.regex'                     => 'La CURP no tiene el formato correcto (ej. ABCD991231HVZRXX00).',
            'fecha_nacimiento.required'      => 'La fecha de nacimiento es obligatoria.',
            'fecha_nacimiento.before'        => 'La fecha de nacimiento debe ser anterior a hoy.',
            'sexo.required'                  => 'El sexo es obligatorio.',
            'municipio_procedencia.required' => 'El municipio de procedencia es obligatorio.',
            'escuela_bachillerato.required'  => 'El nombre de la escuela de bachillerato es obligatorio.',
            'promedio_bachillerato.required' => 'El promedio de bachillerato es obligatorio.',
            'promedio_bachillerato.min'      => 'El promedio mínimo aceptado es 6.0.',
            'promedio_bachillerato.max'      => 'El promedio no puede ser mayor a 10.0.',
            'turno_preferido.required'       => 'El turno preferido es obligatorio.',
            'email.required'                 => 'El correo electrónico es obligatorio.',
            'email.email'                    => 'Ingresa un correo electrónico válido.',
            'email.unique'                   => 'Este correo ya está registrado. Si ya aplicaste, contacta a Control Escolar.',
            'telefono.regex'                 => 'El teléfono debe tener exactamente 10 dígitos.',
            'carrera_id.required'            => 'Debes seleccionar una carrera.',
            'carrera_id.exists'              => 'La carrera seleccionada no existe.',
            'periodo_id.required'                  => 'El periodo de inscripción es obligatorio.',
            'periodo_id.exists'                    => 'El periodo seleccionado no existe.',
            'area_bachillerato.required'           => 'El área de bachillerato es obligatoria.',
            'estado_civil.required'                => 'El estado civil es obligatorio.',
            'medio_enterado.required'              => '¿Por qué medio se enteró? es obligatorio.',
            'tiene_equipo_computo.required'        => 'Indica si cuentas con equipo de cómputo.',
            'constancia_bachillerato.required'     => 'La constancia de estudios es obligatoria.',
            'constancia_bachillerato.max'          => 'El archivo no puede pesar más de 10 MB.',
            'constancia_bachillerato.mimes'        => 'Solo se aceptan archivos PDF, JPG, PNG o WEBP.',
        ];
    }
}
