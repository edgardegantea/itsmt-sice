<?php

namespace App\Http\Controllers\Auth;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Seguridad\Models\AuditLog;
use App\Domains\Seguridad\Models\IncidenteSeguridad;
use App\Domains\Seguridad\Models\TwoFactorSecret;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\TotpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    private const CACHE_PREFIX_2FA = '2fa_challenge:';
    private const UMBRAL_FUERZA_BRUTA = 5;

    public function __construct(private readonly TotpService $totp) {}

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
            AuditLogService::record('login_fallido', 'auth', null, ['identificador' => $identifier]);
            $this->evaluarFuerzaBruta($request);

            return ApiResponse::error('Credenciales incorrectas.', 401);
        }

        $user = Auth::user();

        $dosFactores = TwoFactorSecret::where('user_id', $user->id)->where('enabled', true)->first();
        if ($dosFactores) {
            Auth::logout();

            $challengeToken = Str::random(40);
            Cache::put(self::CACHE_PREFIX_2FA . $challengeToken, $user->id, now()->addMinutes(5));

            return ApiResponse::success([
                'requires_2fa'   => true,
                'challenge_token' => $challengeToken,
            ], 'Ingresa el código de verificación de tu aplicación de autenticación.');
        }

        AuditLogService::record('login', 'auth', $user->id);

        return ApiResponse::success($this->construirPayload($user, $alumno), 'Sesión iniciada correctamente.');
    }

    // POST /api/auth/2fa/verificar
    public function verificarDosFactores(Request $request): JsonResponse
    {
        $data = $request->validate([
            'challenge_token' => ['required', 'string'],
            'codigo'          => ['required', 'string'],
        ]);

        $userId = Cache::get(self::CACHE_PREFIX_2FA . $data['challenge_token']);
        if (! $userId) {
            return ApiResponse::error('El código de verificación expiró. Inicia sesión de nuevo.', 422);
        }

        $user = User::find($userId);
        $secreto = TwoFactorSecret::where('user_id', $userId)->first();

        if (! $user || ! $secreto) {
            return ApiResponse::error('Sesión de verificación inválida.', 422);
        }

        $valido = $this->totp->verificarCodigo($secreto->secret, $data['codigo'])
            || $this->consumirCodigoRecuperacion($secreto, $data['codigo']);

        if (! $valido) {
            AuditLogService::record('2fa_codigo_invalido', 'auth', $user->id);

            return ApiResponse::error('Código inválido o expirado.', 422);
        }

        Cache::forget(self::CACHE_PREFIX_2FA . $data['challenge_token']);
        Auth::login($user);

        AuditLogService::record('login', 'auth', $user->id, ['via' => '2fa']);

        return ApiResponse::success($this->construirPayload($user), 'Sesión iniciada correctamente.');
    }

    private function consumirCodigoRecuperacion(TwoFactorSecret $secreto, string $codigo): bool
    {
        $codigos = $secreto->recovery_codes ?? [];

        foreach ($codigos as $i => $hash) {
            if (Hash::check(strtoupper(trim($codigo)), $hash)) {
                unset($codigos[$i]);
                $secreto->update(['recovery_codes' => array_values($codigos)]);
                return true;
            }
        }

        return false;
    }

    private function evaluarFuerzaBruta(Request $request): void
    {
        $ip = $request->ip();

        $fallosRecientes = AuditLog::where('accion', 'login_fallido')
            ->where('ip_address', $ip)
            ->where('created_at', '>=', now()->subMinutes(15))
            ->count();

        if ($fallosRecientes < self::UMBRAL_FUERZA_BRUTA) {
            return;
        }

        $incidenteAbierto = IncidenteSeguridad::where('tipo', 'fuerza_bruta_sospechosa')
            ->where('ip_address', $ip)
            ->where('estatus', '!=', 'cerrado')
            ->where('detectado_en', '>=', now()->subHour())
            ->exists();

        if ($incidenteAbierto) {
            return;
        }

        IncidenteSeguridad::create([
            'tipo'         => 'fuerza_bruta_sospechosa',
            'ip_address'   => $ip,
            'descripcion'  => "{$fallosRecientes} intentos de inicio de sesión fallidos en los últimos 15 minutos desde esta IP.",
            'severidad'    => 'alta',
            'estatus'      => 'abierto',
            'detectado_en' => now(),
        ]);
    }

    // POST /api/auth/logout
    public function logout(Request $request): JsonResponse
    {
        AuditLogService::record('logout', 'auth', $request->user()->id);

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

    private function construirPayload(User $user, ?Alumno $alumno = null): array
    {
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

        return $data;
    }
}
