<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermisosSeeder extends Seeder
{
    // Módulos y sus acciones disponibles
    public static array $MODULOS = [
        'alumnos'         => ['ver', 'editar', 'eliminar'],
        'aspirantes'      => ['ver', 'editar', 'inscribir'],
        'periodos'        => ['ver', 'editar', 'eliminar'],
        'carreras'        => ['ver', 'editar'],
        'catalogos'       => ['ver', 'editar'],
        'usuarios'        => ['ver', 'editar', 'eliminar'],
        'constancias'     => ['ver', 'editar'],
        'reinscripciones' => ['ver', 'editar'],
        'bajas'           => ['ver', 'crear'],
        'encuestas'       => ['ver'],
        'reportes'        => ['ver'],
        'configuracion'   => ['editar'],
    ];

    // Permisos por defecto para cada rol
    private static array $ROL_PERMISOS = [
        'superadmin' => '*', // todos
        'admin' => [
            'alumnos.ver', 'alumnos.editar',
            'aspirantes.ver', 'aspirantes.editar', 'aspirantes.inscribir',
            'periodos.ver', 'periodos.editar',
            'carreras.ver', 'carreras.editar',
            'catalogos.ver', 'catalogos.editar',
            'usuarios.ver', 'usuarios.editar', 'usuarios.eliminar',
            'constancias.ver', 'constancias.editar',
            'reinscripciones.ver', 'reinscripciones.editar',
            'bajas.ver', 'bajas.crear',
            'encuestas.ver',
            'reportes.ver',
            'configuracion.editar',
        ],
        'director_academico' => [
            'alumnos.ver',
            'aspirantes.ver',
            'periodos.ver',
            'carreras.ver',
            'constancias.ver',
            'reinscripciones.ver',
            'bajas.ver',
            'encuestas.ver',
            'reportes.ver',
        ],
        'personal_administrativo' => [
            'alumnos.ver', 'alumnos.editar',
            'aspirantes.ver', 'aspirantes.editar', 'aspirantes.inscribir',
            'periodos.ver',
            'carreras.ver',
            'constancias.ver', 'constancias.editar',
            'reinscripciones.ver', 'reinscripciones.editar',
            'bajas.ver', 'bajas.crear',
            'encuestas.ver',
            'reportes.ver',
        ],
        'jefe_carrera' => [
            'alumnos.ver', 'alumnos.editar',
            'aspirantes.ver',
            'periodos.ver',
            'carreras.ver',
            'constancias.ver',
            'reinscripciones.ver',
            'bajas.ver', 'bajas.crear',
            'encuestas.ver',
        ],
        'docente' => [
            'alumnos.ver',
            'reportes.ver',
        ],
        'alumno' => [],
    ];

    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Crear todos los permisos
        $todos = [];
        foreach (self::$MODULOS as $modulo => $acciones) {
            foreach ($acciones as $accion) {
                $p = Permission::firstOrCreate(['name' => "{$modulo}.{$accion}", 'guard_name' => 'web']);
                $todos[] = $p->name;
            }
        }

        // Asignar permisos a roles
        foreach (self::$ROL_PERMISOS as $rolNombre => $permisos) {
            $rol = Role::where('name', $rolNombre)->where('guard_name', 'web')->first();
            if (! $rol) continue;

            $lista = $permisos === '*' ? $todos : $permisos;
            $rol->syncPermissions($lista);
        }
    }
}
