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
  para:     { fontSize: 9, marginBottom: 10, lineHeight: 1.7 },
  secHdr:   { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1a3a5c', borderBottomWidth: 1, borderBottomColor: '#1a3a5c', marginTop: 10, marginBottom: 5, paddingBottom: 2 },
  dataRow:  { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#ccc' },
  dataLbl:  { fontFamily: 'Helvetica-Bold', fontSize: 8.5, width: '60%', backgroundColor: '#f0f4f8', padding: 4, borderRightWidth: 0.5, borderRightColor: '#ccc' },
  dataVal:  { flex: 1, fontSize: 8.5, padding: 4, color: '#c0392b', fontFamily: 'Helvetica-Bold' },
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

export default function CartaCompromisoDocsPdf({ inscripcion, cfg }: Props) {
  const { aspirante: asp, carrera, periodo } = inscripcion
  const today = new Date().toLocaleDateString('es-MX', { day:'2-digit', month:'long', year:'numeric' })
  const folio = `${inscripcion.numero_control}-CCD`
  const fechaLimite = (periodo as any).fecha_limite_baja_parcial
    ? new Date((periodo as any).fecha_limite_baja_parcial + 'T12:00:00').toLocaleDateString('es-MX')
    : 'fecha por confirmar'

  return (
    <Document title="Carta Compromiso de Entrega de Documentos">
      <Page size="LETTER" style={S.page}>
        <View style={S.hdrRow}>
          {cfg.logoBase64 && <Image src={cfg.logoBase64} style={S.hdrLogo} />}
          <View style={S.hdrCenter}>
            <Text style={S.hdrInst}>{cfg.nombre_institucion}</Text>
            <Text style={S.hdrSub}>{cfg.subsistema ?? 'Departamento de Servicios Escolares'} · {today}</Text>
          </View>
        </View>
        <View style={S.hdrRule} />

        <Text style={S.folio}>TecNM-AC-PO-001-05 · Folio: {folio}</Text>
        <View style={S.titleBox}><Text style={S.titleTxt}>CARTA COMPROMISO DE ENTREGA DE DOCUMENTOS</Text></View>

        <Text style={S.para}>
          {`En la ciudad de Martínez de la Torre, Ver., a ${today}, el alumno `}
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{asp.nombres} {asp.apellido_paterno} {asp.apellido_materno ?? ''}</Text>
          {`, con CURP `}<Text style={{ fontFamily: 'Helvetica-Bold' }}>{asp.curp}</Text>
          {` y número de control `}<Text style={{ fontFamily: 'Helvetica-Bold' }}>{inscripcion.numero_control}</Text>
          {`, inscrito en la carrera de `}<Text style={{ fontFamily: 'Helvetica-Bold' }}>{carrera.nombre}</Text>
          {`, manifiesta bajo protesta de decir verdad que:`}
        </Text>

        <Text style={S.para}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>Que al momento de su inscripción formal no presentó el Certificado de Bachillerato original</Text>
          {`, y que se compromete a entregarlo a Servicios Escolares del ITSMT `}
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>a más tardar antes del inicio del proceso de reinscripción del siguiente periodo</Text>
          {` (${periodo.nombre}, antes del ${fechaLimite}).`}
        </Text>

        <Text style={S.para}>
          {`El alumno es consciente de que el incumplimiento de esta carta compromiso implicará el `}
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>bloqueo automático de su reinscripción</Text>
          {` en el siguiente periodo, de conformidad con el procedimiento TecNM-AC-PO-001.`}
        </Text>

        <Text style={S.secHdr}>DOCUMENTOS PENDIENTES DE ENTREGA</Text>
        <View style={{ borderWidth: 0.5, borderColor: '#ccc', marginBottom: 10 }}>
          <View style={S.dataRow}>
            <Text style={S.dataLbl}>Certificado de Bachillerato original</Text>
            <Text style={S.dataVal}>⚠ PENDIENTE</Text>
          </View>
        </View>

        <View style={S.firmasRow}>
          <View style={S.firmaCell}>
            <View style={S.firmaLine} />
            <Text style={S.firmaNom}>Firma del Alumno</Text>
            <Text style={S.firmaRol}>{asp.nombres} {asp.apellido_paterno}</Text>
            <Text style={[S.firmaRol, { color: '#777' }]}>NC: {inscripcion.numero_control}</Text>
          </View>
          <View style={S.firmaCell}>
            <View style={S.firmaLine} />
            <Text style={S.firmaNom}>Recibe — Servicios Escolares</Text>
            <Text style={S.firmaRol}>ITSMT — Firma y sello</Text>
          </View>
        </View>

        <Text style={S.footer}>{`Documento generado por SICE — ITSMT · Folio: ${folio}`}</Text>
      </Page>
    </Document>
  )
}
