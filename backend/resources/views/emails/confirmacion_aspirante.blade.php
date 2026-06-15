<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solicitud de admisión recibida — ITSMT</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          {{-- Cabecera --}}
          <tr>
            <td style="background:#1a3a5c;border-radius:12px 12px 0 0;padding:28px 36px;text-align:center;">
              <p style="margin:0;color:#93c5fd;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Instituto Tecnológico Superior de Martínez de la Torre</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">Solicitud de admisión recibida</h1>
            </td>
          </tr>

          {{-- Cuerpo --}}
          <tr>
            <td style="background:#ffffff;padding:36px;">

              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">
                Estimado/a <strong>{{ $aspirante->nombres }} {{ $aspirante->apellido_paterno }}</strong>,
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#475569;">
                Tu solicitud de admisión al <strong>ITSMT</strong> ha sido recibida exitosamente.
                El personal de Control Escolar revisará tu expediente y te notificará el resultado a este mismo correo electrónico.
              </p>

              {{-- Datos del aspirante --}}
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Resumen de tu solicitud</p>
                  </td>
                </tr>
                @php
                  $filas = [
                    ['Nombre completo',     $aspirante->nombres.' '.$aspirante->apellido_paterno.' '.($aspirante->apellido_materno ?? '')],
                    ['CURP',               $aspirante->curp],
                    ['Correo electrónico', $aspirante->email],
                    ['Carrera solicitada', $aspirante->carrera?->nombre ?? '—'],
                    ['Periodo',            $aspirante->periodo?->nombre ?? '—'],
                    ['Turno preferido',    ucfirst($aspirante->turno_preferido)],
                    ['Promedio bachillerato', number_format($aspirante->promedio_bachillerato, 2)],
                    ['Escuela de procedencia', $aspirante->escuela_bachillerato],
                    ['Municipio',          $aspirante->municipio_procedencia],
                    ['Folio de seguimiento', strtoupper(substr($aspirante->id, 0, 8))],
                  ];
                @endphp
                @foreach ($filas as [$label, $value])
                <tr>
                  <td style="padding:10px 20px;border-bottom:1px solid #f1f5f9;width:42%;">
                    <span style="font-size:12px;color:#64748b;font-weight:600;">{{ $label }}</span>
                  </td>
                  <td style="padding:10px 20px;border-bottom:1px solid #f1f5f9;">
                    <span style="font-size:13px;color:#1e293b;font-weight:500;">{{ trim($value) ?: '—' }}</span>
                  </td>
                </tr>
                @endforeach
              </table>

              {{-- Documentos requeridos --}}
              <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#1a3a5c;">Documentos que deberás presentar:</p>
              <ul style="margin:0 0 24px;padding-left:20px;font-size:13px;color:#475569;line-height:2;">
                <li>Acta de nacimiento (original)</li>
                <li>CURP (original)</li>
                <li>Certificado de bachillerato (original)</li>
                <li>6 fotografías tamaño infantil</li>
                <li>Comprobante de domicilio (máximo 3 meses de antigüedad)</li>
                <li>Identificación oficial (INE o pasaporte)</li>
                <li>Número de Seguro Social — NSS (IMSS)</li>
                <li>Comprobante de pago de inscripción</li>
              </ul>

              <p style="margin:0;font-size:13px;color:#64748b;line-height:1.7;">
                Si tienes alguna duda, comunícate con Control Escolar del ITSMT.
              </p>
            </td>
          </tr>

          {{-- Pie --}}
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 12px 12px;padding:20px 36px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#94a3b8;">
                Este es un mensaje automático generado por el SICE — ITSMT. No responder a este correo.<br>
                {{ now()->format('d/m/Y H:i') }} hrs
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
