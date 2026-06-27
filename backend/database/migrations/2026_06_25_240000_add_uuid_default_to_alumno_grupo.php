<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        // Habilita la extensión si no está activa (suele estarlo en PostgreSQL moderno)
        DB::statement('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

        // Asigna gen_random_uuid() como default para que el INSERT sin id funcione
        DB::statement('ALTER TABLE alumno_grupo ALTER COLUMN id SET DEFAULT gen_random_uuid()');
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('ALTER TABLE alumno_grupo ALTER COLUMN id DROP DEFAULT');
    }
};
