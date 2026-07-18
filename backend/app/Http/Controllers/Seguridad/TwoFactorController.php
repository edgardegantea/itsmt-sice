<?php

namespace App\Http\Controllers\Seguridad;

use App\Domains\Seguridad\Models\TwoFactorSecret;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Services\AuditLogService;
use App\Services\TotpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class TwoFactorController extends Controller
{
    public function __construct(private readonly TotpService $totp) {}

    // GET /api/2fa/estatus
    public function estatus(Request $request): JsonResponse
    {
        $secreto = TwoFactorSecret::where('user_id', $request->user()->id)->first();

        return ApiResponse::success([
            'habilitado' => (bool) $secreto?->enabled,
            'confirmado_en' => $secreto?->confirmed_at,
        ]);
    }

    // POST /api/2fa/configurar
    public function configurar(Request $request): JsonResponse
    {
        $user = $request->user();

        $secreto = TwoFactorSecret::updateOrCreate(
            ['user_id' => $user->id],
            ['secret' => $this->totp->generarSecreto(), 'enabled' => false, 'confirmed_at' => null, 'recovery_codes' => null]
        );

        return ApiResponse::success([
            'secreto'      => $secreto->secret,
            'otpauth_url'  => $this->totp->otpAuthUrl($secreto->secret, $user->email),
        ], 'Escanea el código con tu aplicación de autenticación y confirma con un código.');
    }

    // POST /api/2fa/confirmar
    public function confirmar(Request $request): JsonResponse
    {
        $data = $request->validate(['codigo' => ['required', 'string']]);

        $secreto = TwoFactorSecret::where('user_id', $request->user()->id)->first();

        if (! $secreto) {
            return ApiResponse::error('Primero debes configurar la verificación en dos pasos.', 422);
        }

        if (! $this->totp->verificarCodigo($secreto->secret, $data['codigo'])) {
            return ApiResponse::error('Código inválido o expirado.', 422);
        }

        $codigosRecuperacion = $this->totp->generarCodigosRecuperacion();

        $secreto->update([
            'enabled'        => true,
            'confirmed_at'   => now(),
            'recovery_codes' => array_map(fn ($c) => Hash::make($c), $codigosRecuperacion),
        ]);

        AuditLogService::record('2fa_habilitado', 'usuarios', $request->user()->id);

        return ApiResponse::success([
            'codigos_recuperacion' => $codigosRecuperacion,
        ], 'Verificación en dos pasos activada. Guarda estos códigos de recuperación en un lugar seguro; no volverán a mostrarse.');
    }

    // POST /api/2fa/deshabilitar
    public function deshabilitar(Request $request): JsonResponse
    {
        $data = $request->validate(['password' => ['required', 'string']]);

        if (! Hash::check($data['password'], $request->user()->password)) {
            return ApiResponse::error('Contraseña incorrecta.', 422);
        }

        TwoFactorSecret::where('user_id', $request->user()->id)->delete();

        AuditLogService::record('2fa_deshabilitado', 'usuarios', $request->user()->id);

        return ApiResponse::success(null, 'Verificación en dos pasos desactivada.');
    }
}
