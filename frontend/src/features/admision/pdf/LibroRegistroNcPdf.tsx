import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import type { Alumno } from '../services/admision'
import type { ConfiguracionInstitucional } from '../../admin/services/configuracion'

const S = StyleSheet.create({
  page:     { fontFamily: 'Helvetica', fontSize: 7, color: '#111', paddingTop: 46, paddingBottom: 56, paddingHorizontal: 54, backgroundColor: '#fff' },
  hdrRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  hdrLogo:  { width: 38, height: 38, marginRight: 8 },
  hdrCenter:{ flex: 1 },
  hdrInst:  { fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center', color: '#1a3a5c' },
  hdrSub:   { fontSize: 6.5, color: '#555', textAlign: 'center', marginTop: 2 },
  hdrMeta:  { fontSize: 6, color: '#777', textAlign: 'right' },
  hdrRule:  { borderBottomWidth: 1.5, borderBottomColor: '#1a3a5c', marginBottom: 6 },

  titleBox: { backgroundColor: '#1a3a5c', paddingVertical: 4, textAlign: 'center', marginBottom: 5 },
  titleTxt: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: '#fff', textAlign: 'center' },

  metaRow:  { flexDirection: 'row', borderWidth: 0.5, borderColor: '#c5d4e0', marginBottom: 6 },
  metaCell: { padding: '3 5', borderRightWidth: 0.5, borderRightColor: '#c5d4e0', fontSize: 7 },
  metaLbl:  { fontFamily: 'Helvetica-Bold', backgroundColor: '#e8f0f7', color: '#1a3a5c' },

  grpHdr:   { backgroundColor: '#dde8f2', borderLeftWidth: 2.5, borderLeftColor: '#1a3a5c', paddingVertical: 2, paddingHorizontal: 5, marginTop: 6, marginBottom: 2 },
  grpTxt:   { fontFamily: 'Helvetica-Bold', fontSize: 7, color: '#1a3a5c' },

  thead:    { flexDirection: 'row', backgroundColor: '#1a3a5c', paddingVertical: 3 },
  thCell:   { color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 6.5, paddingHorizontal: 3 },

  rowOdd:   { flexDirection: 'row', backgroundColor: '#fff',    paddingVertical: 2.5, borderBottomWidth: 0.3, borderBottomColor: '#e4ecf3' },
  rowEven:  { flexDirection: 'row', backgroundColor: '#f4f7fb', paddingVertical: 2.5, borderBottomWidth: 0.3, borderBottomColor: '#e4ecf3' },
  tdCell:   { fontSize: 6.5, paddingHorizontal: 3 },
  tdMono:   { fontSize: 6.5, paddingHorizontal: 3, fontFamily: 'Helvetica' },

  badge:    { fontSize: 6, fontFamily: 'Helvetica-Bold', borderRadius: 2, paddingVertical: 1, paddingHorizontal: 2 },

  firmasRow:  { flexDirection: 'row', marginTop: 16 },
  firmaCell:  { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  firmaLine:  { borderTopWidth: 0.8, borderTopColor: '#333', width: '80%', marginBottom: 3, marginTop: 24 },
  firmaNom:   { fontFamily: 'Helvetica-Bold', fontSize: 7, textAlign: 'center', color: '#1a3a5c' },
  firmaRol:   { fontSize: 6, color: '#555', textAlign: 'center', marginTop: 1 },

  nota:     { fontSize: 6.5, color: '#777', marginTop: 8, borderTopWidth: 0.5, borderTopColor: '#ddd', paddingTop: 4 },
})

const wNum  = '3%'
const wNc   = '9%'
const wCurp = '13%'
const wNom  = '22%'
const wCar  = '15%'
const wPer  = '12%'
const wFech = '9%'
const wSem  = '5%'
const wEst  = '9%'
const wPad  = '3%'

const BADGE_COLORS: Record<string, [string, string]> = {
  activo:          ['#dcfce7', '#166534'],
  baja_temporal:   ['#fef9c3', '#854d0e'],
  baja_definitiva: ['#fee2e2', '#991b1b'],
  egresado:        ['#dbeafe', '#1e40af'],
  titulado:        ['#ede9fe', '#5b21b6'],
}

interface Props {
  alumnos: Alumno[]
  cfg: ConfiguracionInstitucional & { logoBase64: string | null }
}

export default function LibroRegistroNcPdf({ alumnos, cfg }: Props) {
  const today = new Date().toLocaleDateString('es-MX', { day:'2-digit', month:'2-digit', year:'numeric' })
  const hora  = new Date().toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' })

  const porTipo = new Map<string, Alumno[]>()
  for (const a of alumnos) {
    const key = a.inscripcion?.tipo_ingreso ?? 'SIN CLASIFICAR'
    if (!porTipo.has(key)) porTipo.set(key, [])
    porTipo.get(key)!.push(a)
  }
  const grupos = Array.from(porTipo.entries()).sort(([a],[b]) => a.localeCompare(b,'es'))

  const periodosUnicos = [...new Set(alumnos.map(a => a.periodo_ingreso?.nombre).filter(Boolean))].sort().join(' · ')

  return (
    <Document title="Libro de Registro de Números de Control">
      <Page size="LETTER" orientation="landscape" style={S.page}>
        {/* Header */}
        <View style={S.hdrRow}>
          {cfg.logoBase64 && <Image src={cfg.logoBase64} style={S.hdrLogo} />}
          <View style={S.hdrCenter}>
            <Text style={S.hdrInst}>{cfg.nombre_institucion}</Text>
            <Text style={S.hdrSub}>{cfg.subsistema ?? 'Departamento de Servicios Escolares'}</Text>
          </View>
          <View>
            <Text style={S.hdrMeta}>{`Generado: ${today} ${hora}`}</Text>
            {cfg.clave_tecnm && <Text style={S.hdrMeta}>{`Clave TecNM: ${cfg.clave_tecnm}`}</Text>}
          </View>
        </View>
        <View style={S.hdrRule} />

        <View style={S.titleBox}>
          <Text style={S.titleTxt}>LIBRO DE REGISTRO DE NÚMEROS DE CONTROL  ·  TecNM-AC-PO-001</Text>
        </View>

        {/* Meta */}
        <View style={S.metaRow}>
          <Text style={[S.metaCell, S.metaLbl, { width: '14%' }]}>Fecha emisión</Text>
          <Text style={[S.metaCell, { width: '12%' }]}>{`${today} ${hora}`}</Text>
          <Text style={[S.metaCell, S.metaLbl, { width: '12%' }]}>Total alumnos</Text>
          <Text style={[S.metaCell, { width: '8%', fontFamily: 'Helvetica-Bold' }]}>{alumnos.length}</Text>
          <Text style={[S.metaCell, S.metaLbl, { width: '8%' }]}>Periodos</Text>
          <Text style={[S.metaCell, { flex: 1 }]}>{periodosUnicos}</Text>
        </View>

        {/* Grupos */}
        {grupos.map(([tipo, grupo]) => (
          <View key={tipo}>
            <View style={S.grpHdr}>
              <Text style={S.grpTxt}>{tipo.toUpperCase()}  —  {grupo.length} registro(s)</Text>
            </View>
            <View style={S.thead}>
              <Text style={[S.thCell, { width: wNum }]}>#</Text>
              <Text style={[S.thCell, { width: wNc }]}>N° Control</Text>
              <Text style={[S.thCell, { width: wCurp }]}>CURP</Text>
              <Text style={[S.thCell, { width: wNom }]}>Apellidos, Nombre(s)</Text>
              <Text style={[S.thCell, { width: wCar }]}>Carrera</Text>
              <Text style={[S.thCell, { width: wPer }]}>Periodo ingreso</Text>
              <Text style={[S.thCell, { width: wFech }]}>F. Inscripción</Text>
              <Text style={[S.thCell, { width: wSem, textAlign: 'center' }]}>Sem.</Text>
              <Text style={[S.thCell, { width: wEst }]}>Estatus</Text>
              <Text style={[S.thCell, { width: wPad }]}></Text>
            </View>
            {grupo.map((a, i) => {
              const asp = a.inscripcion?.aspirante
              const ap = (asp?.apellido_paterno ?? '').toUpperCase()
              const am = (asp?.apellido_materno ?? '').toUpperCase()
              const nm = (asp?.nombres ?? '').toUpperCase()
              const apellidos = am ? `${ap} · ${am}` : ap
              const nombre = apellidos + (nm ? `, ${nm}` : '')
              const [bg, fg] = BADGE_COLORS[a.estatus] ?? ['#f1f5f9', '#475569']
              const fechaInsc = a.inscripcion?.fecha_inscripcion
                ? new Date(a.inscripcion?.fecha_inscripcion + 'T12:00:00').toLocaleDateString('es-MX')
                : '—'
              return (
                <View key={a.id} style={i % 2 === 0 ? S.rowOdd : S.rowEven}>
                  <Text style={[S.tdCell, { width: wNum, textAlign: 'center', color: '#888' }]}>{i+1}</Text>
                  <Text style={[S.tdMono, { width: wNc, fontFamily: 'Helvetica-Bold', fontSize: 6.5 }]}>{a.numero_control}</Text>
                  <Text style={[S.tdMono, { width: wCurp, fontSize: 6 }]}>{asp?.curp ?? '—'}</Text>
                  <Text style={[S.tdCell, { width: wNom }]}>{nombre}</Text>
                  <Text style={[S.tdCell, { width: wCar, fontSize: 6.5 }]}>{a.carrera?.nombre ?? '—'}</Text>
                  <Text style={[S.tdCell, { width: wPer, fontSize: 6.5 }]}>{a.periodo_ingreso?.nombre ?? '—'}</Text>
                  <Text style={[S.tdCell, { width: wFech, fontSize: 6.5 }]}>{fechaInsc}</Text>
                  <Text style={[S.tdCell, { width: wSem, textAlign: 'center', fontFamily: 'Helvetica-Bold' }]}>{a.semestre_actual}</Text>
                  <View style={{ width: wEst, justifyContent: 'center', paddingHorizontal: 2 }}>
                    <Text style={[S.badge, { backgroundColor: bg, color: fg }]}>{a.estatus.toUpperCase()}</Text>
                  </View>
                  <Text style={[S.tdCell, { width: wPad }]}></Text>
                </View>
              )
            })}
          </View>
        ))}

        {/* Nota legal */}
        <Text style={S.nota}>
          Este documento constituye el registro oficial de números de control expedidos por el Instituto Tecnológico Superior de Martínez de la Torre. Es un documento de control interno del Departamento de Servicios Escolares. Cualquier modificación posterior deberá documentarse mediante oficio firmado por el Director(a) General y el Jefe(a) de Control Escolar. Prohibida su reproducción parcial sin autorización.
        </Text>

        {/* Firmas */}
        <View style={S.firmasRow}>
          {[
            { nom: 'Director(a) General',       rol: 'Instituto Tecnológico Superior de Martínez de la Torre' },
            { nom: 'Jefe(a) de Control Escolar', rol: 'Departamento de Servicios Escolares · ITSMT' },
            { nom: 'Subdirector(a) Académico(a)', rol: 'ITSMT' },
          ].map(f => (
            <View key={f.nom} style={S.firmaCell}>
              <View style={S.firmaLine} />
              <Text style={S.firmaNom}>{f.nom}</Text>
              <Text style={S.firmaRol}>{f.rol}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}
