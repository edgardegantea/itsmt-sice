<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('instrumentaciones_didacticas', function (Blueprint $table) {
            $table->timestamp('entrega_en')->nullable()->after('estatus');
            $table->boolean('entrega_tardia')->default(false)->after('entrega_en');
        });
    }

    public function down(): void
    {
        Schema::table('instrumentaciones_didacticas', function (Blueprint $table) {
            $table->dropColumn(['entrega_en', 'entrega_tardia']);
        });
    }
};
