<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configuracion_institucional', function (Blueprint $table) {
            $table->string('form_border_radius')->default('lg')->after('fuente_interfaz');
            $table->string('form_density')->default('comfortable')->after('form_border_radius');
            $table->string('form_bg_style')->default('white')->after('form_density');
            $table->string('form_focus_ring_color')->default('#1b396a')->after('form_bg_style');
            $table->string('form_border_tone')->default('slate-200')->after('form_focus_ring_color');
            $table->string('form_label_weight')->default('medium')->after('form_border_tone');
        });
    }

    public function down(): void
    {
        Schema::table('configuracion_institucional', function (Blueprint $table) {
            $table->dropColumn([
                'form_border_radius',
                'form_density',
                'form_bg_style',
                'form_focus_ring_color',
                'form_border_tone',
                'form_label_weight',
            ]);
        });
    }
};
