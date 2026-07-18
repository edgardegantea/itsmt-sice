<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Sprint 30 — Auditoría y Trazabilidad
        // Tabla inmutable: sin soft deletes, sin updated_at. Los registros no se editan ni se borran.
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('accion');            // login/logout/login_fallido/creacion/actualizacion/eliminacion/...
            $table->string('metodo')->nullable(); // GET/POST/PATCH/DELETE
            $table->string('ruta')->nullable();
            $table->string('entidad')->nullable();     // nombre lógico del recurso afectado
            $table->uuid('entidad_id')->nullable();
            $table->unsignedSmallInteger('status_code')->nullable();
            $table->string('ip_address', 64)->nullable();
            $table->text('user_agent')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
