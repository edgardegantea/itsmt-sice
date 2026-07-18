<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password as PasswordRule;

class PasswordController extends Controller
{
    // PATCH /api/auth/cambiar-password
    public function cambiar(Request $request): JsonResponse
    {
        $data = $request->validate([
            'password_actual' => ['required', 'string'],
            'password'        => ['required', 'confirmed', PasswordRule::min(10)->mixedCase()->letters()->numbers()->symbols()],
        ]);

        $user = $request->user();

        if (! Hash::check($data['password_actual'], $user->password)) {
            return ApiResponse::error('La contraseña actual no es correcta.', 422);
        }

        $user->forceFill(['password' => Hash::make($data['password'])])->save();
        $user->tokens()->where('id', '!=', $user->currentAccessToken()?->id)->delete();

        AuditLogService::record('password_actualizada', 'usuarios', $user->id);

        return ApiResponse::success(null, 'Contraseña actualizada. Las demás sesiones activas fueron cerradas.');
    }
}
