@include('pdfs.partials.header')

<div class="folio">CFDI · RFC Emisor: {{ $recibo->rfc_emisor }}</div>
<div class="title">RECIBO OFICIAL DE COBRO</div>

<div class="section">DATOS DEL COMPROBANTE FISCAL (CFDI)</div>
<table class="datos">
  <tr>
    <td class="label">Folio Fiscal (UUID SAT)</td>
    <td colspan="3" style="font-family:monospace; font-size:8pt;">{{ mb_strtoupper($recibo->folio_fiscal, 'UTF-8') }}</td>
  </tr>
  <tr>
    <td class="label">RFC Emisor</td><td>{{ $recibo->rfc_emisor }}</td>
    <td class="label">Fecha de expedición</td><td>{{ $recibo->created_at->format('d/m/Y H:i') }}</td>
  </tr>
  @if($recibo->numero_certificado_sat)
  <tr>
    <td class="label">N° Certificado SAT</td><td colspan="3">{{ $recibo->numero_certificado_sat }}</td>
  </tr>
  @endif
</table>

<div class="section">DATOS DEL ESTUDIANTE</div>
<table class="datos">
  <tr>
    <td class="label">Número de control</td><td>{{ $recibo->alumno->numero_control }}</td>
    <td class="label">Carrera</td><td>{{ $recibo->alumno->carrera?->nombre }}</td>
  </tr>
  <tr>
    <td class="label">Nombre completo</td>
    <td colspan="3">
      {{ $recibo->inscripcion->aspirante->apellido_paterno }}
      {{ $recibo->inscripcion->aspirante->apellido_materno }}
      {{ $recibo->inscripcion->aspirante->nombres }}
    </td>
  </tr>
</table>

<div class="section">DATOS DEL PAGO</div>
<table class="datos">
  <tr>
    <td class="label">Nombre del pagador</td><td>{{ $recibo->nombre_pagador }}</td>
    <td class="label">RFC pagador</td><td>{{ $recibo->rfc_pagador ?? 'XAXX010101000' }}</td>
  </tr>
  <tr>
    <td class="label">Concepto</td><td colspan="3">{{ $recibo->concepto }}</td>
  </tr>
  <tr>
    <td class="label">Importe</td>
    <td colspan="3" style="font-size:14pt; font-weight:bold; color:#1a3a5c;">
      ${{ number_format($recibo->importe, 2) }} MXN
    </td>
  </tr>
</table>

@if($recibo->sello_digital_cfdi)
<div class="section">SELLO DIGITAL</div>
<p style="font-size:7pt; font-family:monospace; word-break:break-all; background:#f8f8f8; padding:6px; border:1px solid #ddd; margin-top:4px;">
  {{ $recibo->sello_digital_cfdi }}
</p>
@endif

<div style="margin-top:36px; display:flex; justify-content:space-between; align-items:flex-end;">
  <div>
    <p style="font-size:8pt; color:#666;">
      Instituto Tecnológico Superior de Martínez de la Torre<br>
      RFC: {{ $recibo->rfc_emisor }}<br>
      Subdirección Administrativa
    </p>
  </div>
  <div class="firma-block">
    <div class="firma-line"></div>
    <p style="font-size:8pt; font-weight:bold;">{{ mb_strtoupper($jefeControlEscolar?->name ?? '___________________________', 'UTF-8') }}</p>
    <p>Jefe(a) de Control Escolar</p>
    <p style="font-size:8pt;">{{ $cfg->nombre_institucion }}</p>
  </div>
</div>

<p style="margin-top:14px; font-size:8pt; color:#666; text-align:center;">
  Este comprobante es válido únicamente con sello digital del SAT.<br>
  Conserva este documento durante tu periodo de estudios.
</p>

@php $folio = 'CFDI-' . mb_strtoupper(mb_substr($recibo->folio_fiscal, 0, 8), 'UTF-8') @endphp
@include('pdfs.partials.footer')
