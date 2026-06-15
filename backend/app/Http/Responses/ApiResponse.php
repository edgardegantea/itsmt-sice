<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;

class ApiResponse
{
    public static function success(mixed $data = null, string $message = 'Operación exitosa', int $status = 200): JsonResponse
    {
        return response()->json([
            'data'    => $data,
            'message' => $message,
            'status'  => $status,
        ], $status);
    }

    public static function error(string $message, int $status, mixed $errors = null): JsonResponse
    {
        $payload = [
            'data'    => null,
            'message' => $message,
            'status'  => $status,
        ];

        if ($errors !== null) {
            $payload['errors'] = $errors;
        }

        return response()->json($payload, $status);
    }
}
