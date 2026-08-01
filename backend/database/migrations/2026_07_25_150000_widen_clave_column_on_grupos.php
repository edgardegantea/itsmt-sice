<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Ensanchar sin doctrine/dbal (no instalado): ALTER COLUMN directo en
// Postgres; en SQLite (tests) las columnas string no imponen longitud real,
// así que ahí es un no-op seguro.
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE grupos ALTER COLUMN clave TYPE VARCHAR(30)');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE grupos ALTER COLUMN clave TYPE VARCHAR(20)');
        }
    }
};
