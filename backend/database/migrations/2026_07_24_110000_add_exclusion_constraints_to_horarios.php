<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * S3-02: backstop a nivel de base de datos contra doble-booking de docente/aula,
 * portado de /Users/edegantea/development/maewalliscorp/propuestahorarios
 * (EXCLUDE USING gist sobre btree_gist), adaptado al esquema de itsmt-sice.
 *
 * Diferencia clave con el original: allá dia_semana/hora_inicio/hora_fin viven
 * en la misma tabla que docente_id/aula_id (cargas_academicas), lo que permite
 * un EXCLUDE directo. Aquí el horario vive en una tabla hija (`horarios`, FK
 * carga_academica_id) porque una carga puede tener varios bloques semanales.
 * Por eso se denormalizan docente_id/aula_id/periodo_id en `horarios` y se
 * mantienen sincronizados con triggers, para que el EXCLUDE constraint sea una
 * garantía real sin importar qué código escriba (incluye seeds/Tinker/futuros
 * endpoints), no solo los paths ya validados en PHP.
 *
 * Es puramente un backstop: la validación de aplicación (VerificarDisponibilidadAction)
 * sigue siendo la fuente de los mensajes de error específicos; esto solo evita
 * que una condición de carrera o un bypass deje datos inconsistentes.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('CREATE EXTENSION IF NOT EXISTS btree_gist');

        Schema::table('horarios', function (Blueprint $table) {
            $table->uuid('docente_id')->nullable();
            $table->uuid('aula_id')->nullable();
            $table->uuid('periodo_id')->nullable();
        });

        // Backfill de filas existentes desde su carga académica.
        DB::statement(<<<'SQL'
            UPDATE horarios h
            SET docente_id = c.docente_id, aula_id = c.aula_id, periodo_id = c.periodo_id
            FROM cargas_academicas c
            WHERE h.carga_academica_id = c.id
        SQL);

        // Trigger 1: al insertar/actualizar un horario, copia los identificadores
        // de recurso desde su carga académica padre.
        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION sync_horario_recurso() RETURNS trigger AS $$
            BEGIN
                SELECT docente_id, aula_id, periodo_id
                INTO NEW.docente_id, NEW.aula_id, NEW.periodo_id
                FROM cargas_academicas
                WHERE id = NEW.carga_academica_id;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql
        SQL);

        DB::statement(<<<'SQL'
            CREATE TRIGGER trg_sync_horario_recurso
            BEFORE INSERT OR UPDATE OF carga_academica_id ON horarios
            FOR EACH ROW EXECUTE FUNCTION sync_horario_recurso()
        SQL);

        // Trigger 2: si una carga académica cambia de docente/aula/periodo,
        // propaga el cambio a sus bloques de horario ya guardados.
        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION sync_carga_academica_a_horarios() RETURNS trigger AS $$
            BEGIN
                IF NEW.docente_id IS DISTINCT FROM OLD.docente_id
                   OR NEW.aula_id IS DISTINCT FROM OLD.aula_id
                   OR NEW.periodo_id IS DISTINCT FROM OLD.periodo_id THEN
                    UPDATE horarios
                    SET docente_id = NEW.docente_id, aula_id = NEW.aula_id, periodo_id = NEW.periodo_id
                    WHERE carga_academica_id = NEW.id;
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql
        SQL);

        DB::statement(<<<'SQL'
            CREATE TRIGGER trg_sync_carga_academica_a_horarios
            AFTER UPDATE OF docente_id, aula_id, periodo_id ON cargas_academicas
            FOR EACH ROW EXECUTE FUNCTION sync_carga_academica_a_horarios()
        SQL);

        // Limpieza de duplicados o traslapes preexistentes en datos antes de aplicar los constraints.
        DB::statement(<<<'SQL'
            DELETE FROM horarios h1
            USING horarios h2
            WHERE h1.docente_id IS NOT NULL
              AND h1.docente_id = h2.docente_id
              AND h1.periodo_id IS NOT DISTINCT FROM h2.periodo_id
              AND h1.dia_semana = h2.dia_semana
              AND h1.id > h2.id
              AND int4range(EXTRACT(EPOCH FROM h1.hora_inicio)::integer, EXTRACT(EPOCH FROM h1.hora_fin)::integer, '[)')
                  && int4range(EXTRACT(EPOCH FROM h2.hora_inicio)::integer, EXTRACT(EPOCH FROM h2.hora_fin)::integer, '[)')
        SQL);

        DB::statement(<<<'SQL'
            DELETE FROM horarios h1
            USING horarios h2
            WHERE h1.aula_id IS NOT NULL
              AND h1.aula_id = h2.aula_id
              AND h1.periodo_id IS NOT DISTINCT FROM h2.periodo_id
              AND h1.dia_semana = h2.dia_semana
              AND h1.id > h2.id
              AND int4range(EXTRACT(EPOCH FROM h1.hora_inicio)::integer, EXTRACT(EPOCH FROM h1.hora_fin)::integer, '[)')
                  && int4range(EXTRACT(EPOCH FROM h2.hora_inicio)::integer, EXTRACT(EPOCH FROM h2.hora_fin)::integer, '[)')
        SQL);

        // Rangos de tiempo vía EXTRACT(EPOCH ...) porque time->timestamp no es
        // IMMUTABLE (requerido por GiST), EXTRACT(EPOCH FROM time) sí lo es.
        // '[)' = medio-abierto, para que bloques consecutivos (10-11, 11-12) no colisionen.
        DB::statement(<<<'SQL'
            ALTER TABLE horarios ADD CONSTRAINT horarios_sin_traslape_docente
            EXCLUDE USING gist (
                docente_id WITH =,
                periodo_id WITH =,
                dia_semana WITH =,
                int4range(EXTRACT(EPOCH FROM hora_inicio)::integer, EXTRACT(EPOCH FROM hora_fin)::integer, '[)') WITH &&
            ) WHERE (docente_id IS NOT NULL)
        SQL);

        DB::statement(<<<'SQL'
            ALTER TABLE horarios ADD CONSTRAINT horarios_sin_traslape_aula
            EXCLUDE USING gist (
                aula_id WITH =,
                periodo_id WITH =,
                dia_semana WITH =,
                int4range(EXTRACT(EPOCH FROM hora_inicio)::integer, EXTRACT(EPOCH FROM hora_fin)::integer, '[)') WITH &&
            ) WHERE (aula_id IS NOT NULL)
        SQL);
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('ALTER TABLE horarios DROP CONSTRAINT IF EXISTS horarios_sin_traslape_docente');
        DB::statement('ALTER TABLE horarios DROP CONSTRAINT IF EXISTS horarios_sin_traslape_aula');
        DB::statement('DROP TRIGGER IF EXISTS trg_sync_carga_academica_a_horarios ON cargas_academicas');
        DB::statement('DROP FUNCTION IF EXISTS sync_carga_academica_a_horarios()');
        DB::statement('DROP TRIGGER IF EXISTS trg_sync_horario_recurso ON horarios');
        DB::statement('DROP FUNCTION IF EXISTS sync_horario_recurso()');

        Schema::table('horarios', function (Blueprint $table) {
            $table->dropColumn(['docente_id', 'aula_id', 'periodo_id']);
        });
    }
};
