<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const ROLES = [
        'control_escolar',
        'direccion_general',
        'direccion_academica',
        'subdireccion_academica',
    ];

    public function up(): void
    {
        foreach (self::ROLES as $nombre) {
            DB::table('roles')->insertOrIgnore([
                'name'       => $nombre,
                'guard_name' => 'web',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('roles')->whereIn('name', self::ROLES)->delete();
    }
};
