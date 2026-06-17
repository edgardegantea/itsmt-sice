<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('encuestas_socioeconomicas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('alumno_id');
            $table->foreign('alumno_id')->references('id')->on('alumnos')->cascadeOnDelete();
            $table->uuid('periodo_id');
            $table->foreign('periodo_id')->references('id')->on('periodos');
            $table->unsignedTinyInteger('semestre');

            // I. Datos del alumno
            $table->string('con_quien_vive', 100)->nullable();
            $table->string('beca', 150)->nullable();          // nombre de la beca si tiene
            $table->boolean('tiene_beca')->default(false);
            $table->string('ingreso_propio', 200)->nullable(); // descripción si tiene ingreso propio

            // III. Padre / tutor
            $table->string('padre_nivel_educativo', 50)->nullable(); // primaria|secundaria|bachiller|superior|postgrado
            $table->string('padre_situacion_laboral', 30)->nullable(); // empleado|jubilado|desempleado|incapacitado
            $table->string('padre_ocupacion', 150)->nullable();
            $table->string('padre_centro_trabajo', 150)->nullable();
            $table->string('padre_cargo', 100)->nullable();
            $table->string('padre_tiempo_servicio', 60)->nullable();
            $table->decimal('padre_ingresos_mensuales', 10, 2)->nullable();
            $table->string('padre_otros_ingresos', 200)->nullable();

            // IV. Madre
            $table->string('madre_nivel_educativo', 50)->nullable();
            $table->string('madre_situacion_laboral', 30)->nullable();
            $table->string('madre_ocupacion', 150)->nullable();
            $table->string('madre_centro_trabajo', 150)->nullable();
            $table->string('madre_cargo', 100)->nullable();
            $table->string('madre_tiempo_servicio', 60)->nullable();
            $table->decimal('madre_ingresos_mensuales', 10, 2)->nullable();
            $table->string('madre_otros_ingresos', 200)->nullable();

            // V. Familia
            $table->unsignedTinyInteger('familia_total_integrantes')->nullable();
            $table->unsignedTinyInteger('familia_num_hijos')->nullable();
            $table->string('familia_edades_hijos', 100)->nullable();
            $table->unsignedTinyInteger('familia_num_estudiantes')->nullable();

            // VI. Vivienda
            $table->string('vivienda_calle', 150)->nullable();
            $table->string('vivienda_numero', 20)->nullable();
            $table->string('vivienda_colonia', 100)->nullable();
            $table->string('vivienda_municipio', 100)->nullable();
            $table->string('vivienda_tipo', 50)->nullable(); // propia|alquilada|alquiler_venta|invasion|alquiler_familiar|otro
            $table->string('vivienda_tipo_propiedad', 50)->nullable(); // casa_independiente|condominio|dpto_edificio|quinta|dpto_otra_casa|otro
            $table->text('vivienda_otras_propiedades')->nullable();

            // Vehículo
            $table->boolean('tiene_vehiculo')->default(false);
            $table->json('vehiculos')->nullable(); // [{tipo, marca, año}]
            $table->string('traslado_escuela', 50)->nullable(); // vehiculo_propio|bicicleta|motocicleta|a_pie|transporte_publico

            // Ingresos y egresos familia
            $table->decimal('total_ingresos_familia', 10, 2)->nullable();
            $table->decimal('otros_ingresos_familia', 10, 2)->nullable();
            $table->json('gastos_mensuales')->nullable(); // {luz, agua, tel_fija, tel_celular, internet, tv_cable, renta, transporte, material_escolar, salud, alimentacion, otros}
            $table->decimal('total_egresos_familia', 10, 2)->nullable();

            // VII. Salud
            $table->string('salud_estado', 20)->nullable(); // buena|regular|deficiente
            $table->boolean('salud_problema_familiar')->default(false);
            $table->string('salud_especifique', 300)->nullable();

            // VIII. Información adicional
            $table->text('informacion_adicional')->nullable();

            $table->timestamp('enviada_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Un alumno solo puede tener una encuesta por periodo
            $table->unique(['alumno_id', 'periodo_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('encuestas_socioeconomicas');
    }
};
