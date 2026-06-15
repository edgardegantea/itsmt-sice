<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Acepta email institucional O número de control del alumno
            'email'    => ['required', 'string'],
            'password' => ['required', 'string'],
        ];
    }
}
