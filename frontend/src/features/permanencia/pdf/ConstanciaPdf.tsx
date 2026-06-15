import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer'
import type { Constancia } from '../services/permanencia'

Font.register({
  family: 'Helvetica',
  fonts: [],
})

const s = StyleSheet.create({
  page:     { fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a', padding: '2cm 2.5cm' },
  header:   { flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderBottom: '1.5 solid #1a3a5c', paddingBottom: 12 },
  logo:     { width: 52, height: 52, objectFit: 'contain', marginRight: 16 },
  inst:     { flex: 1 },
  instName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1a3a5c' },
  instSub:  { fontSize: 8.5, color: '#555', marginTop: 2 },
  title:    { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1a3a5c', textAlign: 'center', marginVertical: 20, textTransform: 'uppercase', letterSpacing: 1 },
  folio:    { fontSize: 8, color: '#888', textAlign: 'right', marginBottom: 16 },
  body:     { fontSize: 10, lineHeight: 1.8, textAlign: 'justify', marginBottom: 16 },
  bold:     { fontFamily: 'Helvetica-Bold' },
  table:    { marginTop: 12, marginBottom: 20 },
  row:      { flexDirection: 'row', borderBottom: '0.5 solid #ddd', paddingVertical: 5 },
  cell:     { flex: 1, fontSize: 9 },
  cellLabel:{ flex: 1, fontSize: 9, color: '#555' },
  firmas:   { flexDirection: 'row', justifyContent: 'space-around', marginTop: 50 },
  firma:    { alignItems: 'center', width: 160 },
  firmaLine:{ borderTop: '1 solid #333', width: 140, marginBottom: 4 },
  firmaNom: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  firmaRol: { fontSize: 8, color: '#666', textAlign: 'center' },
  sello:    { position: 'absolute', bottom: 50, right: '2.5cm', fontSize: 7, color: '#bbb', textAlign: 'center' },
})

const TIPO_LABEL: Record<string, string> = {
  estudios:      'CONSTANCIA DE ESTUDIOS',
  inscripcion:   'CONSTANCIA DE INSCRIPCIÓN',
  calificaciones:'CONSTANCIA DE CALIFICACIONES',
}

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function fmtFecha(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
}

interface Props {
  constancia: Constancia & {
    alumno: {
      id: string
      numero_control: string
      semestre_actual?: number
      user?: { name: string }
      carrera?: { nombre: string }
      periodoIngreso?: { nombre: string }
    }
  }
  cfg: {
    nombre_institucion: string
    nombre_corto: string
    dependencia?: string | null
    clave_tecnm?: string | null
    director?: string | null
    logoBase64?: string | null
  }
}

export default function ConstanciaPdf({ constancia, cfg }: Props) {
  const alumno  = constancia.alumno
  const nombre  = alumno.user?.name ?? '—'
  const carrera = alumno.carrera?.nombre ?? '—'
  const nc      = alumno.numero_control ?? '—'
  const semestre= alumno.semestre_actual ? `${alumno.semestre_actual}°` : '—'
  const hoy     = fmtFecha(constancia.emitida_en ?? new Date().toISOString())
  const titulo  = TIPO_LABEL[constancia.tipo] ?? 'CONSTANCIA'

  const texto = constancia.tipo === 'estudios'
    ? `que ${nombre} se encuentra inscrito/a en esta institución en la carrera de ${carrera}, correspondiente al semestre ${semestre}, del periodo ${alumno.periodoIngreso?.nombre ?? 'vigente'}.`
    : constancia.tipo === 'inscripcion'
    ? `que ${nombre}, con número de control ${nc}, está formalmente inscrito/a en la carrera de ${carrera} para el periodo académico vigente, habiendo cumplido con todos los requisitos de inscripción establecidos por esta institución.`
    : `que ${nombre}, con número de control ${nc}, ha cursado y acreditado las materias correspondientes al semestre ${semestre} de la carrera de ${carrera}, conforme al plan de estudios vigente.`

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* Encabezado */}
        <View style={s.header}>
          {cfg.logoBase64 && <Image src={cfg.logoBase64} style={s.logo} />}
          <View style={s.inst}>
            <Text style={s.instName}>{cfg.nombre_institucion}</Text>
            {cfg.dependencia && <Text style={s.instSub}>{cfg.dependencia}</Text>}
            {cfg.clave_tecnm && <Text style={s.instSub}>Clave: {cfg.clave_tecnm} · TecNM</Text>}
          </View>
        </View>

        {/* Folio */}
        <Text style={s.folio}>Folio: {constancia.folio_unico}</Text>

        {/* Título */}
        <Text style={s.title}>{titulo}</Text>

        {/* Cuerpo */}
        <Text style={s.body}>
          La Subdirección Académica del {cfg.nombre_institucion}, por este conducto hace constar {texto}
        </Text>

        {/* Datos del alumno */}
        <View style={s.table}>
          {[
            ['Nombre completo', nombre],
            ['Número de control', nc],
            ['Carrera', carrera],
            ['Semestre', semestre],
          ].map(([label, val]) => (
            <View style={s.row} key={label}>
              <Text style={s.cellLabel}>{label}</Text>
              <Text style={[s.cell, s.bold]}>{val}</Text>
            </View>
          ))}
        </View>

        <Text style={s.body}>
          La presente constancia se expide a petición del interesado/a, el día {hoy}, para los fines que estime convenientes.
        </Text>

        {/* Firmas */}
        <View style={s.firmas}>
          <View style={s.firma}>
            <View style={s.firmaLine} />
            <Text style={s.firmaNom}>Control Escolar</Text>
            <Text style={s.firmaRol}>{cfg.nombre_corto}</Text>
          </View>
          <View style={s.firma}>
            <View style={s.firmaLine} />
            <Text style={s.firmaNom}>{cfg.director ?? 'Director/a General'}</Text>
            <Text style={s.firmaRol}>Dirección General</Text>
          </View>
        </View>

        {/* Sello */}
        <Text style={s.sello}>Documento generado electrónicamente — {cfg.clave_tecnm}</Text>
      </Page>
    </Document>
  )
}
