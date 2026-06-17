<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('directorio_personal', function (Blueprint $table) {
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete()->after('id');
            $table->foreignUuid('area_id')->nullable()->constrained('directorio_areas')->nullOnDelete()->after('area');
            $table->foreignUuid('puesto_id')->nullable()->constrained('directorio_puestos')->nullOnDelete()->after('cargo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('directorio_personal', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn(['user_id', 'area_id', 'puesto_id']);
        });
    }
};
