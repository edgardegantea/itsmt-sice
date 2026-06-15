<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12pt; margin: 0; padding: 0; }
        .header { text-align: center; border-bottom: 2px solid #003366; padding-bottom: 10px; margin-bottom: 20px; }
        .header h1 { font-size: 14pt; color: #003366; margin: 4px 0; }
        .header h2 { font-size: 12pt; color: #555; margin: 2px 0; }
        .folio { text-align: right; font-size: 10pt; color: #888; margin-bottom: 20px; }
        .cuerpo { text-align: justify; line-height: 1.8; }
        .firma { margin-top: 60px; text-align: center; }
        .firma p { border-top: 1px solid #000; display: inline-block; padding-top: 5px; min-width: 200px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>INSTITUTO TECNOLÓGICO SUPERIOR DE MARTÍNEZ DE LA TORRE</h1>
        <h2>CONSTANCIA DE ESTUDIOS</h2>
    </div>

    <div class="folio">Folio: {{ $folio }} &nbsp;&nbsp; Fecha: {{ $fecha }}</div>

    <div class="cuerpo">
        <p>
            La Dirección del Instituto Tecnológico Superior de Martínez de la Torre, hace constar que
            <strong>{{ $nombre }}</strong>, con número de control <strong>{{ $numero_control }}</strong>,
            se encuentra inscrito(a) en el <strong>{{ $semestre }}°</strong> semestre de la carrera de
            <strong>{{ $carrera }}</strong>, correspondiente al periodo <strong>{{ $periodo }}</strong>.
        </p>
        <p>
            La presente constancia se expide a petición del interesado para los fines que convengan,
            en Martínez de la Torre, Veracruz, a {{ $fecha }}.
        </p>
    </div>

    <div class="firma">
        <p>Director(a) General</p>
    </div>
</body>
</html>
