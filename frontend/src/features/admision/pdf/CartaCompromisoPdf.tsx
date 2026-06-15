import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import type { InscripcionDetalle } from '../services/admision'
import type { ConfiguracionInstitucional } from '../../admin/services/configuracion'

const S = StyleSheet.create({
  page:     { fontFamily: 'Helvetica', fontSize: 9, color: '#1a1a1a', paddingTop: 54, paddingBottom: 60, paddingHorizontal: 54, backgroundColor: '#fff' },
  hdrRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  hdrLogo:  { width: 42, height: 42, marginRight: 8 },
  hdrCenter:{ flex: 1 },
  hdrInst:  { fontSize: 10.5, fontFamily: 'Helvetica-Bold', textAlign: 'center', color: '#1a3a5c' },
  hdrSub:   { fontSize: 7.5, color: '#555', textAlign: 'center', marginTop: 2 },
  hdrRule:  { borderBottomWidth: 2, borderBottomColor: '#1a3a5c', marginBottom: 10 },
  folio:    { fontSize: 7.5, color: '#555', textAlign: 'right', marginBottom: 6 },
  titleBox: { borderWidth: 1, borderColor: '#1a3a5c', paddingVertical: 5, textAlign: 'center', marginBottom: 12 },
  titleTxt: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: '#1a3a5c', textAlign: 'center' },
  intro:    { fontSize: 9, marginBottom: 10, lineHeight: 1.6 },
  secHdr:   { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1a3a5c', borderBottomWidth: 1, borderBottomColor: '#1a3a5c', marginTop: 10, marginBottom: 5, paddingBottom: 2 },
  listItem: { fontSize: 9, marginBottom: 4, lineHeight: 1.5, paddingLeft: 12 },
  firmasRow:{ flexDirection: 'row', marginTop: 30 },
  firmaCell:{ flex: 1, alignItems: 'center', paddingHorizontal: 16 },
  firmaLine:{ borderTopWidth: 0.8, borderTopColor: '#333', width: '100%', marginBottom: 3, marginTop: 40 },
  firmaNom: { fontFamily: 'Helvetica-Bold', fontSize: 8, textAlign: 'center' },
  firmaRol: { fontSize: 7, color: '#555', textAlign: 'center', marginTop: 2 },
  footer:   { fontSize: 7, color: '#777', textAlign: 'center', marginTop: 14, borderTopWidth: 0.5, borderTopColor: '#ddd', paddingTop: 4 },
})

interface Props {
  inscripcion: InscripcionDetalle
  cfg: ConfiguracionInstitucional & { logoBase64: string | null }
}

const COMPROMISOS_ALUMNO = [
  'Cumplir puntualmente con el pago de cuotas y derechos escolares en los plazos establecidos.',
  'Acreditar el plan de estudios correspondiente a su carrera conforme a la normativa del TecNM.',
  'Hacer uso adecuado de las instalaciones, equipos y recursos de la institución.',
  'Observar y cumplir el Reglamento de Estudiantes del Tecnológico Nacional de México.',
  'Mantener conducta ética y respetuosa con la comunidad universitaria.',
  'Informar oportunamente cualquier cambio en su situación académica o personal.',
]

const COMPROMISOS_INST = [
  'Proporcionar formación profesional de calidad conforme al plan de estudios TecNM.',
  'Garantizar atención en ventanilla y servicios escolares en horarios establecidos.',
  'Gestionar los trámites de reinscripción en los periodos correspondientes.',
  'Facilitar acceso a biblioteca, cómputo y laboratorios según normativa vigente.',
]

export default function CartaCompromisoPdf({ inscripcion, cfg }: Props) {
  const { aspirante: asp, carrera } = inscripcion
  const today = new Date().toLocaleDateString('es-MX', { day:'2-digit', month:'long', year:'numeric' })
  const nomAlumno = `${asp.nombres} ${asp.apellido_paterno} ${asp.apellido_materno ?? ''}`
  const folio = `${inscripcion.numero_control}-CC`

  return (
    <Document title="Carta Compromiso del Estudiante">
      <Page size="LETTER" style={S.page}>
        <View style={S.hdrRow}>
          {cfg.logoBase64 && <Image src={cfg.logoBase64} style={S.hdrLogo} />}
          <View style={S.hdrCenter}>
            <Text style={S.hdrInst}>{cfg.nombre_institucion}</Text>
            <Text style={S.hdrSub}>{cfg.subsistema ?? 'Departamento de Servicios Escolares'} · {today}</Text>
          </View>
        </View>
        <View style={S.hdrRule} />

        <Text style={S.folio}>Art. 2 Reglamento de Estudiantes TecNM · Folio: {folio}</Text>

        <View style={S.titleBox}><Text style={S.titleTxt}>CARTA COMPROMISO DEL ESTUDIANTE</Text></View>

        <Text style={S.intro}>
          {`En la ciudad de Martínez de la Torre, Ver., a ${today}, el alumno `}
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{nomAlumno}</Text>
          {`, con número de control `}
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{inscripcion.numero_control}</Text>
          {`, inscrito en la carrera de `}
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{carrera.nombre}</Text>
          {`, manifiesta su conocimiento y aceptación de los siguientes compromisos:`}
        </Text>

        <Text style={S.secHdr}>COMPROMISOS DEL ESTUDIANTE</Text>
        {COMPROMISOS_ALUMNO.map((c, i) => (
          <Text key={i} style={S.listItem}>{`${i+1}. ${c}`}</Text>
        ))}

        <Text style={S.secHdr}>COMPROMISOS DE LA INSTITUCIÓN</Text>
        {COMPROMISOS_INST.map((c, i) => (
          <Text key={i} style={S.listItem}>{`${i+1}. ${c}`}</Text>
        ))}

        <View style={S.firmasRow}>
          <View style={S.firmaCell}>
            <View style={S.firmaLine} />
            <Text style={S.firmaNom}>Firma del Alumno</Text>
            <Text style={S.firmaRol}>{asp.nombres} {asp.apellido_paterno}</Text>
          </View>
          <View style={S.firmaCell}>
            <View style={S.firmaLine} />
            <Text style={S.firmaNom}>Firma del Director</Text>
            <Text style={S.firmaRol}>Instituto Tecnológico Superior de Martínez de la Torre</Text>
          </View>
        </View>

        <Text style={S.footer}>{`Documento generado por SICE — ITSMT · Folio: ${folio}`}</Text>
      </Page>
    </Document>
  )
}
