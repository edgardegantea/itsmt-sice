{{-- header.html para Gotenberg/Chromium: documento aparte que se imprime en el margen
     superior de cada página. Chromium lo dibuja con escala propia, por eso lleva tamaños
     explícitos y los márgenes laterales del formato. --}}
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
    html, body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
    body { padding: 28pt 57pt 0 71pt; width: 100%; box-sizing: border-box; }
</style>
</head>
<body>
@include('pdfs.partials.instrumentacion_encabezado', ['logoTec' => $d['logo_tec'], 'logoInst' => $d['logo_inst']])
</body>
</html>
