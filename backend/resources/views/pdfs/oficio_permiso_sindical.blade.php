<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111; margin: 0; padding: 20px; }
        .header { text-align: center; margin-bottom: 24px; }
        .header h1 { font-size: 13px; margin: 0 0 4px; text-transform: uppercase; }
        .header p  { font-size: 10px; color: #555; margin: 0; }
        .oficio-num { text-align: right; font-size: 10px; color: #666; margin-bottom: 16px; }
        .destinatario { margin-bottom: 14px; }
        .body-text { text-align: justify; line-height: 1.6; margin-bottom: 12px; }
        .dato { display: inline-block; font-weight: bold; border-bottom: 1px solid #333; min-width: 160px; }
        .grupos { margin: 10px 0 10px 20px; font-size: 10px; }
        .firma { margin-top: 60px; text-align: center; }
        .firma .linea { border-top: 1px solid #333; width: 260px; margin: 0 auto 4px; }
        .firma p { font-size: 10px; margin: 2px 0; }
        .sello { text-align: right; margin-top: 10px; font-size: 9px; color: #999; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Instituto Tecnológico Superior de la Milpa Alta</h1>
        <p>Subdirección Académica &bull; Dirección del Instituto</p>
    </div>

    <div class="oficio-num">
        OFICIO N.° SICE-PS-{{ strtoupper(substr($permiso->id, 0, 8)) }}&nbsp;&nbsp;&nbsp;Milpa Alta, {{ $fecha }}
    </div>

    <div class="destinatario">
        <p><strong>ASUNTO:</strong> Permiso sindical autorizado</p>
    </div>

    <p class="body-text">
        Por medio del presente, la Dirección del Instituto comunica que se ha autorizado el siguiente
        <strong>permiso sindical</strong>:
    </p>

    <table style="width:100%; border-collapse:collapse; margin-bottom:14px; font-size:10px;">
        <tr>
            <td style="padding:4px 8px; background:#f0f4f8; font-weight:bold; width:35%;">Docente:</td>
            <td style="padding:4px 8px;">{{ $permiso->docente?->name ?? '—' }}</td>
        </tr>
        <tr>
            <td style="padding:4px 8px; background:#f0f4f8; font-weight:bold;">Tipo de permiso:</td>
            <td style="padding:4px 8px;">{{ ucwords(str_replace('_', ' ', $permiso->tipo_permiso)) }}</td>
        </tr>
        <tr>
            <td style="padding:4px 8px; background:#f0f4f8; font-weight:bold;">Período:</td>
            <td style="padding:4px 8px;">
                Del {{ $permiso->fecha_inicio?->format('d/m/Y') }} al {{ $permiso->fecha_fin?->format('d/m/Y') }}
                ({{ $permiso->dias_totales }} días)
            </td>
        </tr>
        <tr>
            <td style="padding:4px 8px; background:#f0f4f8; font-weight:bold;">Goce de sueldo:</td>
            <td style="padding:4px 8px;">{{ $permiso->con_goce_sueldo ? 'Con goce de sueldo' : 'Sin goce de sueldo' }}</td>
        </tr>
        <tr>
            <td style="padding:4px 8px; background:#f0f4f8; font-weight:bold;">Motivo:</td>
            <td style="padding:4px 8px;">{{ $permiso->motivo }}</td>
        </tr>
        @if($grupos->count() > 0)
        <tr>
            <td style="padding:4px 8px; background:#f0f4f8; font-weight:bold; vertical-align:top;">Grupos afectados:</td>
            <td style="padding:4px 8px;">
                @foreach($grupos as $c)
                    {{ $c->grupo?->clave ?? '—' }} — {{ $c->materia?->nombre ?? '—' }}<br>
                @endforeach
            </td>
        </tr>
        @endif
    </table>

    <p class="body-text">
        Durante el período de ausencia, el docente deberá realizar las gestiones necesarias para garantizar
        la continuidad académica de los grupos a su cargo.
    </p>

    <div class="firma">
        <div class="linea"></div>
        <p><strong>Director del Instituto</strong></p>
        <p>Instituto Tecnológico Superior de la Milpa Alta — TecNM</p>
    </div>

    <div class="sello">Generado por SICE &bull; {{ $fecha }}</div>
</body>
</html>
