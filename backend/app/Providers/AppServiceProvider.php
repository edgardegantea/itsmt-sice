<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        ini_set('memory_limit', env('PHP_MEMORY_LIMIT', '256M'));
    }

    public function boot(): void
    {
        // Superadmin bypasses every Gate / Policy check in the system.
        Gate::before(function ($user) {
            if ($user->hasRole('superadmin')) {
                return true;
            }
        });

        // Las policies de cada dominio se registran en su propio ServiceProvider
        // de módulo (app/Domains/{Dominio}/Providers), no aquí.

        // Apunta el enlace de reset al frontend
        ResetPassword::createUrlUsing(function (object $notifiable, string $token): string {
            $frontend = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173')), '/');
            return "{$frontend}/reset-password?token={$token}&email=" . urlencode($notifiable->getEmailForPasswordReset());
        });
    }
}
