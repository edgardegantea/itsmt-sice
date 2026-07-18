<?php

namespace App\Services;

class TotpService
{
    private const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    private const PERIODO = 30;
    private const DIGITOS = 6;

    public function generarSecreto(int $bytes = 20): string
    {
        return $this->base32Encode(random_bytes($bytes));
    }

    public function otpAuthUrl(string $secreto, string $cuenta, string $emisor = 'ITSMT-SICE'): string
    {
        $label = rawurlencode("{$emisor}:{$cuenta}");

        return "otpauth://totp/{$label}?secret={$secreto}&issuer=" . rawurlencode($emisor)
            . '&algorithm=SHA1&digits=' . self::DIGITOS . '&period=' . self::PERIODO;
    }

    public function verificarCodigo(string $secreto, string $codigo, int $ventana = 1): bool
    {
        $codigo = preg_replace('/\s+/', '', $codigo);
        $timestampActual = (int) floor(time() / self::PERIODO);

        for ($i = -$ventana; $i <= $ventana; $i++) {
            if (hash_equals($this->generarCodigo($secreto, $timestampActual + $i), $codigo)) {
                return true;
            }
        }

        return false;
    }

    public function generarCodigo(string $secreto, ?int $contador = null): string
    {
        $contador ??= (int) floor(time() / self::PERIODO);

        $clave = $this->base32Decode($secreto);
        $contadorBinario = pack('N*', 0, $contador);
        $hash = hash_hmac('sha1', $contadorBinario, $clave, true);

        $offset = ord($hash[strlen($hash) - 1]) & 0x0F;
        $binario = ((ord($hash[$offset]) & 0x7F) << 24)
            | ((ord($hash[$offset + 1]) & 0xFF) << 16)
            | ((ord($hash[$offset + 2]) & 0xFF) << 8)
            | (ord($hash[$offset + 3]) & 0xFF);

        $codigo = $binario % (10 ** self::DIGITOS);

        return str_pad((string) $codigo, self::DIGITOS, '0', STR_PAD_LEFT);
    }

    public function generarCodigosRecuperacion(int $cantidad = 8): array
    {
        return collect(range(1, $cantidad))
            ->map(fn () => strtoupper(bin2hex(random_bytes(5))))
            ->values()
            ->all();
    }

    private function base32Encode(string $data): string
    {
        $binario = '';
        foreach (str_split($data) as $char) {
            $binario .= str_pad(decbin(ord($char)), 8, '0', STR_PAD_LEFT);
        }

        $salida = '';
        foreach (str_split($binario, 5) as $chunk) {
            $chunk = str_pad($chunk, 5, '0', STR_PAD_RIGHT);
            $salida .= self::BASE32_ALPHABET[bindec($chunk)];
        }

        return $salida;
    }

    private function base32Decode(string $b32): string
    {
        $b32 = strtoupper(preg_replace('/[^A-Z2-7]/i', '', $b32));

        $binario = '';
        foreach (str_split($b32) as $char) {
            $pos = strpos(self::BASE32_ALPHABET, $char);
            if ($pos === false) {
                continue;
            }
            $binario .= str_pad(decbin($pos), 5, '0', STR_PAD_LEFT);
        }

        $salida = '';
        foreach (str_split($binario, 8) as $byte) {
            if (strlen($byte) === 8) {
                $salida .= chr(bindec($byte));
            }
        }

        return $salida;
    }
}
