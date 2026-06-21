@php
  $cfg = \App\Domains\Institucional\Models\ConfiguracionInstitucional::instancia();
  $logoB64 = $cfg->logoBase64();

  // Firmantes dinámicos desde la BD
  $directorGeneral        = \App\Models\User::role('admin')->orderBy('created_at')->first();
  $jefeControlEscolar     = \App\Models\User::where('email', 'servescolares@martineztorre.tecnm.mx')->first()
                            ?? \App\Models\User::role('personal_administrativo')->orderBy('created_at')->first();
  $subdirectorAcademico   = \App\Models\User::where('email', 'subacademica@martineztorre.tecnm.mx')->first();
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 10pt; color: #1a1a1a; }
    .header { border-bottom: 2px solid #1a3a5c; padding-bottom: 10px; margin-bottom: 16px; }
    .header table { width: 100%; border-collapse: collapse; }
    .header-logo { width: 64px; text-align: center; vertical-align: middle; padding-right: 10px; }
    .header-logo img { height: 52px; max-width: 60px; object-fit: contain; }
    .header-logo-txt { font-size: 9pt; font-weight: bold; color: #1a3a5c; letter-spacing: 1px; }
    .header-center { text-align: center; vertical-align: middle; }
    .header-center h1 { font-size: 11pt; font-weight: bold; color: #1a3a5c; }
    .header-center p  { font-size: 8.5pt; color: #555; margin-top: 2px; }
    .header-right { text-align: right; vertical-align: top; font-size: 8pt; color: #777; white-space: nowrap; padding-left: 10px; }
    .folio { text-align: right; font-size: 8pt; color: #555; margin-bottom: 10px; }
    .title { font-size: 12pt; font-weight: bold; text-align: center; padding: 10px; margin-bottom: 20px; }
    .section { font-size: 9pt; font-weight: bold; color: #1a3a5c;
               border-bottom: 1px solid #1a3a5c; margin: 12px 0 6px; }
    table.datos { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 10px; }
    table.datos td { padding: 4px 6px; border: 1px solid #ccc; }
    table.datos td.label { font-weight: bold; background: #f0f4f8; width: 38%; }
    .firma-block { display: inline-block; text-align: center; width: 44%; margin-top: 40px; }
    .firma-line { border-top: 1px solid #333; margin-top: 40px; }
    .footer { font-size: 7.5pt; color: #777; text-align: center; margin-top: 24px;
              border-top: 1px solid #ddd; padding-top: 6px; }
  </style>
</head>
<body>
<div class="header">
  <table>
    <tr>
      <td class="header-logo">
        @if($logoB64)
          <img src="{{ $logoB64 }}" alt="{{ $cfg->nombre_corto }}">
        @else
          <span class="header-logo-txt">{{ $cfg->nombre_corto }}</span>
        @endif
      </td>
      <td class="header-center">
        <h1>{{ $cfg->nombre_institucion }}</h1>
        <p>{{ $cfg->dependencia ?? 'Tecnológico Nacional de México' }} · {{ now()->format('d/m/Y') }}</p>
      </td>
      <td class="header-right">
        @if($cfg->clave_tecnm)<strong>{{ $cfg->clave_tecnm }}</strong><br>@endif
        @if($cfg->ciudad){{ $cfg->ciudad }}{{ $cfg->estado ? ', ' . $cfg->estado : '' }}@endif
      </td>
    </tr>
  </table>
</div>
