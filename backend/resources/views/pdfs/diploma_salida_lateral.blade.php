<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; margin: 0; color: #1a1a1a; background: #fff; }
  .borde { border: 8px double #8b6914; padding: 30px; min-height: 650px; }
  .header { text-align: center; margin-bottom: 20px; }
  .header h2 { font-size: 14pt; color: #1a3a5c; margin: 4px 0; text-transform: uppercase; letter-spacing: 2px; }
  .titulo-diploma { font-size: 26pt; color: #8b6914; font-weight: bold; text-align: center; margin: 18px 0 4px 0; letter-spacing: 4px; text-transform: uppercase; }
  .subtitulo { font-size: 11pt; text-align: center; color: #555; margin-bottom: 20px; font-style: italic; }
  .cuerpo { font-size: 12pt; line-height: 2; text-align: center; margin: 20px 40px; }
  .nombre { font-size: 20pt; color: #1a3a5c; font-weight: bold; border-bottom: 2px solid #8b6914; display: inline-block; padding: 0 20px; margin: 10px 0; }
  .detalle { font-size: 11pt; margin: 14px 40px; line-height: 1.8; text-align: center; }
  .fecha { text-align: center; margin-top: 30px; font-size: 11pt; font-style: italic; }
  .firmas { margin-top: 60px; display: flex; justify-content: space-around; }
  .firma { text-align: center; width: 200px; }
  .firma .linea { border-top: 1px solid #333; margin-bottom: 6px; }
  .firma p { font-size: 9.5pt; margin: 2px 0; }
  .footer { margin-top: 20px; font-size: 8pt; color: #aaa; text-align: center; }
</style>
</head>
<body>
<div class="borde">
  <div class="header">
    <h2>Instituto Tecnológico Superior de Misantla</h2>
    <p style="font-size:9pt; color:#888; margin:2px 0;">Tecnológico Nacional de México</p>
  </div>

  <div class="titulo-diploma">Diploma</div>
  <div class="subtitulo">de Salida Lateral</div>

  <div class="cuerpo">
    <p>El <strong>Instituto Tecnológico Superior de Misantla</strong>, miembro del Tecnológico Nacional de México,</p>
    <p>otorga el presente diploma a:</p>
    <br>
    <span class="nombre">{{ $salidaLateral->alumno->user->name }}</span>
    <br>
    <p style="margin-top:8px;">No. de control: <strong>{{ $salidaLateral->alumno->numero_control }}</strong></p>
  </div>

  <div class="detalle">
    <p>Por haber cursado y acreditado el <strong>{{ number_format($salidaLateral->porcentaje_creditos_al_solicitar, 1) }}%</strong>
    de los créditos correspondientes al plan de estudios de la carrera de:</p>
    <p style="font-size:13pt; font-weight:bold; color:#1a3a5c;">{{ $salidaLateral->alumno->carrera->nombre ?? '—' }}</p>
    <p>con la asignatura de especialidad:</p>
    <p style="font-style:italic; color:#555;">{{ $salidaLateral->asignaturaEspecialidad->nombre ?? '—' }}</p>
    <p>durante el periodo: <strong>{{ $salidaLateral->periodoSolicitud->nombre ?? '—' }}</strong></p>
  </div>

  <div class="fecha">
    Misantla, Veracruz, {{ now()->isoFormat('D [de] MMMM [de] YYYY') }}
  </div>

  <div class="firmas">
    <div class="firma">
      <div class="linea"></div>
      <p><strong>Director del Instituto</strong></p>
      <p>Instituto Tecnológico Superior de Misantla</p>
    </div>
    <div class="firma">
      <div class="linea"></div>
      <p><strong>Jefe de Servicios Escolares</strong></p>
      <p>Instituto Tecnológico Superior de Misantla</p>
    </div>
  </div>

  <div class="footer">
    ITSMT — SICE · Diploma generado el {{ now()->isoFormat('D/MM/YYYY') }}
  </div>
</div>
</body>
</html>
