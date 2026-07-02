<?php

namespace App\Http\Controllers\Auth;

use App\Domains\Academico\Models\Alumno;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    // POST /api/auth/login
    public function login(LoginRequest $request): JsonResponse
    {
        $identifier = $request->email;
        $password   = $request->password;
        $alumno     = null;

        if (! str_contains($identifier, '@')) {
            $alumno = Alumno::where('numero_control', strtoupper($identifier))->first();

            if (! $alumno?->user_id) {
                return ApiResponse::error('Credenciales incorrectas.', 401);
            }

            $email = $alumno->user->email;
        } else {
            $email = $identifier;
        }

        if (! Auth::attempt(['email' => $email, 'password' => $password])) {
            return ApiResponse::error('Credenciales incorrectas.', 401);
        }

        $user  = Auth::user();
        $token = $user->createToken('api-token')->plainTextToken;

        $data = [
            'token' => $token,
            'user'  => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'roles' => $user->getRoleNames(),
            ],
        ];

        if ($user->hasRole('alumno')) {
            $alumnoModel = $alumno
                ? $alumno->load(['carrera', 'periodoIngreso', 'inscripcion'])
                : Alumno::with(['carrera', 'periodoIngreso', 'inscripcion'])->where('user_id', $user->id)->first();

            if ($alumnoModel) {
                $data['user']['numero_control']                     = $alumnoModel->numero_control;
                $data['user']['carrera']                            = $alumnoModel->carrera?->nombre;
                $data['user']['semestre']                           = $alumnoModel->semestre_actual;
                $data['user']['estatus']                            = $alumnoModel->estatus;
                $data['user']['pendiente_certificado_bachillerato'] = $alumnoModel->pendiente_certificado_bachillerato;
                $data['user']['periodo_ingreso']                    = $alumnoModel->periodoIngreso?->nombre;
                $data['user']['tipo_ingreso']                       = $alumnoModel->inscripcion?->tipo_ingreso;
                $data['user']['observaciones_estatus']              = $alumnoModel->observaciones_estatus;
                $data['user']['alumno_id']                          = $alumnoModel->id;
            }
        }

        return ApiResponse::success($data, 'Sesión iniciada correctamente.');
    }

    // POST /api/auth/logout
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return ApiResponse::success(null, 'Sesión cerrada correctamente.');
    }

    // GET /api/auth/me
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('carrera');

        $data = [
            'id'          => $user->id,
            'name'        => $user->name,
            'email'       => $user->email,
            'roles'       => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
            'carrera_id'  => $user->carrera_id,
            'carrera'     => $user->carrera ? ['id' => $user->carrera->id, 'nombre' => $user->carrera->nombre, 'clave' => $user->carrera->clave] : null,
        ];

        if ($user->hasRole('alumno')) {
            $alumno = Alumno::with(['carrera', 'periodoIngreso', 'inscripcion'])->where('user_id', $user->id)->first();
            if ($alumno) {
                $data['numero_control']                     = $alumno->numero_control;
                $data['carrera']                            = $alumno->carrera?->nombre;
                $data['semestre']                           = $alumno->semestre_actual;
                $data['estatus']                            = $alumno->estatus;
                $data['pendiente_certificado_bachillerato'] = $alumno->pendiente_certificado_bachillerato;
                $data['periodo_ingreso']                    = $alumno->periodoIngreso?->nombre;
                $data['tipo_ingreso']                       = $alumno->inscripcion?->tipo_ingreso;
                $data['observaciones_estatus']              = $alumno->observaciones_estatus;
                $data['alumno_id']                          = $alumno->id;
            }
        }

        return ApiResponse::success($data);
    }
}
