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
  para:     { fontSize: 9, marginBottom: 8, lineHeight: 1.6 },
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

const OBL_INST = [
  'Impartir los programas de estudio correspondientes al plan de la carrera.',
  'Emitir evaluaciones periódicas y actas de calificaciones en tiempo y forma.',
  'Otorgar servicios de biblioteca, laboratorio y cómputo conforme a reglamento.',
  'Tramitar los documentos oficiales (constancias, certificados) en los plazos institucionales.',
]

const OBL_ALUMNO = [
  'Cubrir las cuotas y derechos escolares en las fechas establecidas por el ITSMT.',
  'Cursar y acreditar las materias del semestre de acuerdo con el plan de estudios.',
  'Hacer buen uso de las instalaciones y equipo de la institución.',
  'Cumplir el Reglamento Interno de Estudiantes del TecNM vigente.',
]

export default function ContratoEstudiantePdf({ inscripcion, cfg }: Props) {
  const { aspirante: asp, carrera, periodo } = inscripcion
  const today = new Date().toLocaleDateString('es-MX', { day:'2-digit', month:'long', year:'numeric' })
  const folio = `${inscripcion.numero_control}-CT`
  const fechaInicio = new Date(periodo.fecha_inicio + 'T12:00:00').toLocaleDateString('es-MX')
  const fechaFin    = new Date(periodo.fecha_fin    + 'T12:00:00').toLocaleDateString('es-MX')

  return (
    <Document title="Contrato con el Estudiante">
      <Page size="LETTER" style={S.page}>
        <View style={S.hdrRow}>
          {cfg.logoBase64 && <Image src={cfg.logoBase64} style={S.hdrLogo} />}
          <View style={S.hdrCenter}>
            <Text style={S.hdrInst}>{cfg.nombre_institucion}</Text>
            <Text style={S.hdrSub}>{cfg.subsistema ?? 'Departamento de Servicios Escolares'} · {today}</Text>
          </View>
        </View>
        <View style={S.hdrRule} />

        <Text style={S.folio}>TecNM-AC-PO-001-03 · Folio: {folio}</Text>
        <View style={S.titleBox}><Text style={S.titleTxt}>CONTRATO CON EL ESTUDIANTE</Text></View>

        <Text style={S.intro}>
          {`Contrato bilateral celebrado entre el `}
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>Instituto Tecnológico Superior de Martínez de la Torre (ITSMT)</Text>
          {` y el alumno `}
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{asp.nombres} {asp.apellido_paterno} {asp.apellido_materno ?? ''}</Text>
          {`, con número de control `}
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{inscripcion.numero_control}</Text>
          {`, para el periodo `}
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{periodo.nombre}</Text>
          {`.`}
        </Text>

        <Text style={S.secHdr}>PRIMERA — OBJETO DEL CONTRATO</Text>
        <Text style={S.para}>
          {`El ITSMT se compromete a prestar servicios educativos de nivel superior en la carrera de `}
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{carrera.nombre}</Text>
          {`, conforme al plan de estudios aprobado por la Secretaría de Educación Pública y el Tecnológico Nacional de México.`}
        </Text>

        <Text style={S.secHdr}>SEGUNDA — OBLIGACIONES DE LA INSTITUCIÓN</Text>
        {OBL_INST.map((c, i) => <Text key={i} style={S.listItem}>{`• ${c}`}</Text>)}

        <Text style={S.secHdr}>TERCERA — OBLIGACIONES DEL ALUMNO</Text>
        {OBL_ALUMNO.map((c, i) => <Text key={i} style={S.listItem}>{`• ${c}`}</Text>)}

        <Text style={S.secHdr}>CUARTA — VIGENCIA</Text>
        <Text style={S.para}>
          {`El presente contrato tiene vigencia durante el periodo académico `}
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{periodo.nombre}</Text>
          {` (del ${fechaInicio} al ${fechaFin}).`}
        </Text>

        <View style={S.firmasRow}>
          <View style={S.firmaCell}>
            <View style={S.firmaLine} />
            <Text style={S.firmaNom}>El Alumno</Text>
            <Text style={S.firmaRol}>{asp.nombres} {asp.apellido_paterno}</Text>
            <Text style={[S.firmaRol, { color: '#777' }]}>NC: {inscripcion.numero_control}</Text>
          </View>
          <View style={S.firmaCell}>
            <View style={S.firmaLine} />
            <Text style={S.firmaNom}>Por la Institución</Text>
            <Text style={S.firmaRol}>Subdirección Académica — ITSMT</Text>
          </View>
        </View>

        <Text style={S.footer}>{`Documento generado por SICE — ITSMT · Folio: ${folio}`}</Text>
      </Page>
    </Document>
  )
}
