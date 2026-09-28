<?php

namespace App\Support;

/**
 * Los campos de texto libre de Planeación Docente (caracterización, actividades, etc.)
 * guardan el HTML del editor enriquecido del frontend (RichTextField: negrita, cursiva,
 * listas, alineación). Ninguna de las dos superficies que los exportan interpreta ese HTML
 * tal cual: PhpWord::addText() lo trata como texto literal, y las plantillas Blade de los
 * PDFs usaban `{{ }}` (escapado) — sin conversión, ambas mostrarían las etiquetas tal cual
 * ("<div><br></div>") en vez del texto.
 */
class RichText
{
    /** Reduce el HTML a texto plano preservando viñetas y saltos de línea — para PhpWord
     * (addText() no interpreta HTML) y como respaldo. No conserva negrita/cursiva/
     * alineación: si la superficie de destino sí puede pintar HTML real, usa aHtmlSeguro(). */
    public static function aPlano(?string $html): string
    {
        if (! $html) {
            return '';
        }
        $html = preg_replace('/<li[^>]*>/i', '• ', $html) ?? $html;
        $html = preg_replace('/<\/(li|p|div)>/i', "\n", $html) ?? $html;
        $html = preg_replace('/<br\s*\/?>/i', "\n", $html) ?? $html;
        $html = strip_tags($html);
        $html = html_entity_decode($html, ENT_QUOTES, 'UTF-8');

        return trim(preg_replace('/\n{3,}/', "\n\n", $html) ?? $html);
    }

    private const ETIQUETAS_PERMITIDAS = ['b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'br', 'p', 'div', 'span'];

    /** Lista blanca de HTML segura para pintar con dompdf ({!! !!} en Blade — dompdf sí
     * interpreta HTML/CSS real, a diferencia de PhpWord, así que aquí SÍ vale la pena
     * conservar negrita/cursiva/listas/alineación en vez de aplanar a texto plano).
     *
     * El array `competencias` no tiene validación de esquema en el backend (ver
     * PlaneacionDocenteController) — cualquiera con acceso a la API podría meter HTML
     * arbitrario ahí directamente, sin pasar por el editor del frontend. Esta es la única
     * defensa real antes de que ese HTML se imprima sin escapar en el PDF, así que además de
     * restringir las etiquetas (todo lo demás se desenreda mantiendo su texto, no se borra
     * junto con su contenido) se limita el atributo `style` a la única propiedad que el
     * editor puede producir (text-align), descartando cualquier otra declaración —
     * "background:url(...)" u otras no tienen forma de colarse. */
    public static function aHtmlSeguro(?string $html): string
    {
        if (! $html) {
            return '';
        }

        $doc = new \DOMDocument();
        // LIBXML_NOERROR/NOWARNING: dompdf no necesita un documento HTML completo, solo el
        // fragmento — sin el wrapper <html><body> de abajo, DOMDocument reordena etiquetas de
        // forma imprevisible al no tener una raíz válida donde colgarlas.
        @$doc->loadHTML(
            '<?xml encoding="utf-8"?><html><body>' . $html . '</body></html>',
            LIBXML_NOERROR | LIBXML_NOWARNING
        );

        $body = $doc->getElementsByTagName('body')->item(0);
        if (! $body) {
            return '';
        }

        self::limpiarNodo($doc, $body);

        $resultado = '';
        foreach (iterator_to_array($body->childNodes) as $hijo) {
            $resultado .= $doc->saveHTML($hijo);
        }

        return trim($resultado);
    }

    private static function limpiarNodo(\DOMDocument $doc, \DOMNode $nodo): void
    {
        foreach (iterator_to_array($nodo->childNodes) as $hijo) {
            if ($hijo instanceof \DOMText) {
                continue;
            }
            if (! $hijo instanceof \DOMElement) {
                $nodo->removeChild($hijo);
                continue;
            }

            $tag = strtolower($hijo->tagName);

            // script/style no deberían aparecer nunca viniendo del editor real — solo de un
            // intento directo por API — pero a diferencia de una etiqueta normal no permitida
            // (que se desenreda conservando su texto), su "texto" es código/CSS, no contenido
            // legible: desenredarla dejaría el JS/CSS pegado como texto plano visible en el
            // PDF. Se borran enteras, con su contenido.
            if (in_array($tag, ['script', 'style'], true)) {
                $nodo->removeChild($hijo);
                continue;
            }

            self::limpiarNodo($doc, $hijo);

            if (! in_array($tag, self::ETIQUETAS_PERMITIDAS, true)) {
                // Etiqueta no permitida: se desenreda (unwrap) en vez de borrarse — conserva
                // el texto/hijos ya limpios de adentro, solo descarta la etiqueta en sí.
                while ($hijo->firstChild) {
                    $nodo->insertBefore($hijo->firstChild, $hijo);
                }
                $nodo->removeChild($hijo);
                continue;
            }

            foreach (iterator_to_array($hijo->attributes ?? []) as $attr) {
                if (strtolower($attr->name) !== 'style') {
                    $hijo->removeAttribute($attr->name);
                    continue;
                }
                if (preg_match('/text-align\s*:\s*(left|right|center|justify)/i', $attr->value, $m)) {
                    $hijo->setAttribute('style', 'text-align: ' . strtolower($m[1]) . ';');
                } else {
                    $hijo->removeAttribute('style');
                }
            }
        }
    }
}
