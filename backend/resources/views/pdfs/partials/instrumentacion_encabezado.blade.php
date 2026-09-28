{{-- Encabezado del formato del SGC (logo TecNM | título | logo del instituto). Lo usan el
     PDF por Chromium (como header.html de Gotenberg) y el de dompdf (como bloque fijo). --}}
<table style="width:100%; border-collapse:collapse; border:0.6pt solid #000; font-family:Arial, Helvetica, sans-serif;">
    <tr>
        <td style="width:13%; height:46pt; text-align:center; vertical-align:middle; padding:3pt 4pt;">
            @if($logoTec)<img src="{{ $logoTec }}" style="max-width:88pt; max-height:40pt;" alt="">@endif
        </td>
        <td style="border-left:0.6pt solid #000; text-align:center; vertical-align:middle; font-weight:bold; font-size:12pt; line-height:1.15; padding:3pt 4pt; color:#000;">
            Instrumentación Didáctica para la formación y desarrollo de competencias<br>profesionales-Ingreso Agosto 2015 del SGI del G4
        </td>
        <td style="width:9%; border-left:0.6pt solid #000; text-align:center; vertical-align:middle; padding:3pt 4pt;">
            @if($logoInst)<img src="{{ $logoInst }}" style="max-width:52pt; max-height:44pt;" alt="">@endif
        </td>
    </tr>
</table>
