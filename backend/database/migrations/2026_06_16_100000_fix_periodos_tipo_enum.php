<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Normaliza valores legacy 'regular'→'ordinario', 'intensivo'→'intersemestral'
        DB::table('periodos')->where('tipo', 'regular')->update(['tipo' => 'ordinario']);
        DB::table('periodos')->where('tipo', 'intensivo')->update(['tipo' => 'intersemestral']);
    }

    public function down(): void
    {
        DB::table('periodos')->where('tipo', 'ordinario')->update(['tipo' => 'regular']);
        DB::table('periodos')->where('tipo', 'intersemestral')->update(['tipo' => 'intensivo']);
    }
};
