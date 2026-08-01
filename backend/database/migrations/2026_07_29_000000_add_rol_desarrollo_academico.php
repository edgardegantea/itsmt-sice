<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        Role::firstOrCreate(['name' => 'desarrollo_academico', 'guard_name' => 'web']);
    }

    public function down(): void
    {
        Role::where('name', 'desarrollo_academico')->delete();
    }
};
