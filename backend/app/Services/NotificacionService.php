<?php

namespace App\Services;

use App\Models\Notificacion;
use App\Models\User;
use Illuminate\Support\Collection;

class NotificacionService
{
    /**
     * Enviar una notificación a un usuario específico.
     */
    public static function enviarAUsuario(
        User|string $user,
        string $titulo,
        string $mensaje,
        string $tipo = 'info',
        ?string $link = null
    ): Notificacion {
        $userId = $user instanceof User ? $user->id : $user;

        return Notificacion::create([
            'user_id' => $userId,
            'titulo'  => $titulo,
            'mensaje' => $mensaje,
            'tipo'    => $tipo,
            'link'    => $link,
            'leida'   => false,
        ]);
    }

    /**
     * Enviar una notificación a todos los usuarios con roles específicos (ej: superadmin, admin).
     */
    public static function enviarARoles(
        array $roles,
        string $titulo,
        string $mensaje,
        string $tipo = 'info',
        ?string $link = null
    ): Collection {
        $usuarios = User::role($roles)->get();
        $notificaciones = collect();

        foreach ($usuarios as $usuario) {
            $notificaciones->push(self::enviarAUsuario($usuario, $titulo, $mensaje, $tipo, $link));
        }

        return $notificaciones;
    }
}
