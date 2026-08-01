<?php

namespace App\Http\Controllers\Auth;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Admision\Models\Aspirante;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Mail\ResetPasswordAlumnoMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class PasswordResetController extends Controller
{
    // POST /api/auth/forgot-password
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['identifier' => ['required', 'string', 'max:100']]);

        $identifier = trim($request->identifier);

        return str_contains($identifier, '@')
            ? $this->forgotPasswordPorEmail($identifier)
            : $this->forgotPasswordPorCurp(strtoupper($identifier));
    }

    // Nota de seguridad: esta respuesta es intencionalmente idéntica exista o
    // no la cuenta/CURP (mismo status, mismo mensaje), para no permitir que
    // alguien sin autenticar enumere qué correos/CURPs tienen cuenta activa.
    private function forgotPasswordPorEmail(string $email): JsonResponse
    {
        $email = strtolower(trim($email));
        $user  = User::where('email', $email)->first();

        if ($user) {
            $status = Password::sendResetLink(['email' => $email]);
            if ($status !== Password::RESET_LINK_SENT) {
                return ApiResponse::error('No se pudo enviar el correo. Intenta de nuevo.', 500);
            }
        }

        return ApiResponse::success(
            ['destino' => $this->enmascararEmail($email)],
            'Si el correo corresponde a una cuenta registrada, se ha enviado un enlace de recuperación.'
        );
    }

    private function forgotPasswordPorCurp(string $curp): JsonResponse
    {
        $aspirante = Aspirante::where('curp', $curp)->first();

        $alumno = $aspirante
            ? Alumno::whereHas('inscripcion', fn($q) => $q->where('aspirante_id', $aspirante->id))
                ->with('user')
                ->first()
            : null;

        if ($alumno?->user) {
            $token    = Password::broker()->createToken($alumno->user);
            $frontend = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173')), '/');
            $resetUrl = "{$frontend}/reset-password?token={$token}&email=" . urlencode($alumno->user->email);

            Mail::to($aspirante->email)->send(new ResetPasswordAlumnoMail(
                "{$aspirante->nombres} {$aspirante->apellido_paterno}",
                $resetUrl
            ));
        }

        return ApiResponse::success(
            ['destino' => 'el correo registrado en tu solicitud de admisión'],
            'Si la CURP corresponde a una cuenta activa, se ha enviado un enlace de recuperación.'
        );
    }

    // POST /api/auth/reset-password
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token'    => ['required', 'string'],
            'email'    => ['required', 'string'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)->letters()->numbers()],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill(['password' => Hash::make($password)])->save();
                $user->tokens()->delete();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return ApiResponse::success(null, 'Contraseña actualizada.');
        }

        throw ValidationException::withMessages(['email' => [__($status)]]);
    }

    private function enmascararEmail(string $email): string
    {
        [$local, $domain] = explode('@', $email);
        return mb_substr($local, 0, 1) . '***@' . $domain;
    }
}
