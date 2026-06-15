import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import type { InscripcionDetalle } from '../services/admision'
import type { ConfiguracionInstitucional } from '../../admin/services/configuracion'

const DOCS = [
  'Certificado de bachillerato o equivalente **',
  'Acta de nacimiento',
  'CURP',
  '2 fotografías recientes',
  'Dictamen de revalidación o equivalencia de estudios *',
  'Copia de documento migratorio (en caso de ser extranjero) *',
  'Copia de comprobante de cuota por concepto de inscripción',
  'Certificado médico',
  'Constancia de estudios de bachillerato',
]

const S = StyleSheet.create({
  page:     { fontFamily: 'Helvetica', fontSize: 9, color: '#1a1a1a', paddingTop: 54, paddingBottom: 60, paddingHorizontal: 54, backgroundColor: '#fff' },
  hdrRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  hdrLogo:  { width: 42, height: 42, marginRight: 8 },
  hdrCenter:{ flex: 1 },
  hdrInst:  { fontSize: 10.5, fontFamily: 'Helvetica-Bold', textAlign: 'center', color: '#1a3a5c' },
  hdrSub:   { fontSize: 7.5, color: '#555', textAlign: 'center', marginTop: 2 },
  hdrMeta:  { fontSize: 6.5, color: '#777', textAlign: 'right' },
  hdrRule:  { borderBottomWidth: 2, borderBottomColor: '#1a3a5c', marginBottom: 10 },

  topRow:   { flexDirection: 'row', marginBottom: 6, fontSize: 8.5 },
  topLbl:   { fontFamily: 'Helvetica-Bold', color: '#1a3a5c' },
  topVal:   { borderBottomWidth: 0.5, borderBottomColor: '#333', flex: 1, marginLeft: 3, paddingBottom: 1 },

  titleBox: { backgroundColor: '#1a3a5c', paddingVertical: 5, textAlign: 'center', marginVertical: 6 },
  titleTxt: { fontFamily: 'Helvetica-Bold', fontSize: 10.5, color: '#fff', textAlign: 'center' },
  codeRow:  { fontSize: 7, color: '#777', textAlign: 'right', marginBottom: 8 },

  secHdr:   { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1a3a5c', borderBottomWidth: 1.5, borderBottomColor: '#1a3a5c', marginTop: 8, marginBottom: 4, paddingBottom: 2 },

  dRow:     { flexDirection: 'row', marginBottom: 4 },
  dLbl:     { fontFamily: 'Helvetica-Bold', color: '#1a3a5c', fontSize: 8, width: '28%' },
  dVal:     { flex: 1, fontSize: 8.5, borderBottomWidth: 0.5, borderBottomColor: '#333', paddingBottom: 1 },
  dLbl2:    { fontFamily: 'Helvetica-Bold', color: '#1a3a5c', fontSize: 8, width: '18%', marginLeft: 8 },
  dVal2:    { width: '22%', fontSize: 8.5, borderBottomWidth: 0.5, borderBottomColor: '#333', paddingBottom: 1 },

  boxBorder:{ borderWidth: 1.5, borderColor: '#1a3a5c', padding: 6, marginTop: 8 },
  boxTitle: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#1a3a5c', marginBottom: 4 },
  boxSub:   { fontSize: 7.5, color: '#333', marginBottom: 5 },

  docThRow:  { flexDirection: 'row', backgroundColor: '#e8f0f7', paddingVertical: 3 },
  docTh:     { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: '#1a3a5c', borderWidth: 0.5, borderColor: '#b0c4d8', padding: 3 },
  docTdRow:  { flexDirection: 'row', paddingVertical: 2 },
  docTdRowAlt:{ flexDirection: 'row', paddingVertical: 2, backgroundColor: '#f8fafc' },
  docTd:     { fontSize: 7.5, borderWidth: 0.5, borderColor: '#dde4ec', padding: 3 },

  note:     { fontSize: 7, color: '#666', marginTop: 4 },

  firmasRow:  { flexDirection: 'row', marginTop: 18 },
  firmaCell:  { flex: 1, alignItems: 'center', paddingHorizontal: 12 },
  firmaLine:  { borderTopWidth: 0.8, borderTopColor: '#333', width: '100%', marginBottom: 3, marginTop: 36 },
  firmaNom:   { fontFamily: 'Helvetica-Bold', fontSize: 8, textAlign: 'center', color: '#1a3a5c' },
  firmaRol:   { fontSize: 7, color: '#555', textAlign: 'center', marginTop: 2 },

  footer:   { fontSize: 7, color: '#777', textAlign: 'center', marginTop: 12, borderTopWidth: 0.5, borderTopColor: '#ddd', paddingTop: 4 },
})

interface Props {
  inscripcion: InscripcionDetalle
  cfg: ConfiguracionInstitucional & { logoBase64: string | null }
}

function uf(s: string) { return (s ?? '').toUpperCase() }

export default function SolicitudInscripcionPdf({ inscripcion, cfg }: Props) {
  const { aspirante: asp, carrera, periodo } = inscripcion
  const today = new Date().toLocaleDateString('es-MX', { day:'2-digit', month:'long', year:'numeric' })
  const nombreCompleto = `${uf(asp.apellido_paterno)} ${uf(asp.apellido_materno ?? '')}, ${uf(asp.nombres)}`
  const folio = `${inscripcion.numero_control}-SI`

  return (
    <Document title="Solicitud de Inscripción">
      <Page size="LETTER" style={S.page}>
        {/* Header */}
        <View style={S.hdrRow}>
          {cfg.logoBase64 && <Image src={cfg.logoBase64} style={S.hdrLogo} />}
          <View style={S.hdrCenter}>
            <Text style={S.hdrInst}>{cfg.nombre_institucion}</Text>
            <Text style={S.hdrSub}>{cfg.subsistema ?? 'Departamento de Servicios Escolares'} · {today}</Text>
          </View>
          <Text style={S.hdrMeta}>{cfg.clave_tecnm ?? ''}</Text>
        </View>
        <View style={S.hdrRule} />

        {/* Top row */}
        <View style={{ flexDirection: 'row', marginBottom: 4 }}>
          <View style={{ flex: 1, flexDirection: 'row', marginRight: 10 }}>
            <Text style={S.topLbl}>INSTITUTO TECNOLÓGICO: </Text>
            <Text style={[S.topVal, { flex: 1 }]}>{uf(cfg.nombre_institucion)}</Text>
          </View>
          <View style={{ width: '25%', flexDirection: 'row', marginRight: 10 }}>
            <Text style={S.topLbl}>PERIODO: </Text>
            <Text style={S.topVal}>{periodo.nombre}</Text>
          </View>
          <View style={{ width: '22%', flexDirection: 'row' }}>
            <Text style={S.topLbl}>FECHA: </Text>
            <Text style={{ fontSize: 8, color: '#555' }}>{today}</Text>
          </View>
        </View>

        {/* Title */}
        <View style={S.titleBox}><Text style={S.titleTxt}>SOLICITUD DE INSCRIPCIÓN</Text></View>
        <Text style={S.codeRow}>{`Código: TecNM-AC-PO-001-02  ·  Rev. O  ·  N° Control: ${inscripcion.numero_control}`}</Text>

        {/* Datos personales */}
        <Text style={S.secHdr}>DATOS PERSONALES</Text>
        <View style={S.dRow}>
          <Text style={S.dLbl}>NOMBRE: </Text>
          <Text style={S.dVal}>{nombreCompleto} <Text style={{ fontSize: 7, color: '#777' }}>(Ap. paterno, materno, nombre(s))</Text></Text>
        </View>
        <View style={S.dRow}>
          <Text style={S.dLbl}>CURP: </Text>
          <Text style={[S.dVal, { width: '25%', flex: undefined, fontFamily: 'Helvetica' }]}>{asp.curp}</Text>
          <Text style={S.dLbl2}>SEXO: </Text>
          <Text style={S.dVal2}>{asp.sexo.charAt(0).toUpperCase() + asp.sexo.slice(1)}</Text>
        </View>
        <View style={S.dRow}>
          <Text style={S.dLbl}>F. NACIMIENTO: </Text>
          <Text style={[S.dVal, { width: '25%', flex: undefined }]}>{asp.fecha_nacimiento}</Text>
          <Text style={S.dLbl2}>ESTADO CIVIL: </Text>
          <Text style={S.dVal2}>{asp.estado_civil ? asp.estado_civil.replace(/_/g,' ') : '—'}</Text>
        </View>
        <View style={S.dRow}>
          <Text style={S.dLbl}>TELÉFONO: </Text>
          <Text style={[S.dVal, { width: '25%', flex: undefined }]}>{asp.telefono ?? '—'}</Text>
          <Text style={S.dLbl2}>E-MAIL: </Text>
          <Text style={S.dVal2}>{asp.email}</Text>
        </View>

        {/* Escuela de procedencia */}
        <Text style={S.secHdr}>ESCUELA DE PROCEDENCIA</Text>
        <View style={S.dRow}>
          <Text style={S.dLbl}>NOMBRE DE LA ESCUELA: </Text>
          <Text style={S.dVal}>{uf(asp.escuela_bachillerato)}</Text>
          <Text style={S.dLbl2}>PROMEDIO: </Text>
          <Text style={S.dVal2}>{asp.promedio_bachillerato?.toFixed(1)}</Text>
        </View>
        <View style={S.dRow}>
          <Text style={S.dLbl}>MUNICIPIO PROCEDENCIA: </Text>
          <Text style={[S.dVal, { width: '25%', flex: undefined }]}>{asp.municipio_procedencia}</Text>
          {asp.folio_exani ? (
            <>
              <Text style={S.dLbl2}>EXANI-II: </Text>
              <Text style={S.dVal2}>{asp.puntaje_exani ? `${Math.round(asp.puntaje_exani)} pts` : asp.folio_exani}</Text>
            </>
          ) : <View style={{ flex: 1 }} />}
        </View>

        {/* Carrera */}
        <Text style={S.secHdr}>CARRERA</Text>
        <View style={S.dRow}>
          <Text style={S.dLbl}>CARRERA A CURSAR: </Text>
          <Text style={S.dVal}>{uf(carrera.nombre)}</Text>
          <Text style={S.dLbl2}>TURNO: </Text>
          <Text style={S.dVal2}>{asp.turno_preferido}</Text>
        </View>
        <View style={S.dRow}>
          <Text style={S.dLbl}>TIPO DE INGRESO: </Text>
          <Text style={[S.dVal, { width: '25%', flex: undefined }]}>{inscripcion.tipo_ingreso.replace(/_/g,' ')}</Text>
          <Text style={S.dLbl2}>SEMESTRE: </Text>
          <Text style={S.dVal2}>{inscripcion.semestre_ingreso}°</Text>
        </View>

        {/* Checklist documentos */}
        <View style={S.boxBorder}>
          <Text style={S.boxTitle}>PARA USO EXCLUSIVO DEL DEPARTAMENTO DE SERVICIOS ESCOLARES</Text>
          <Text style={S.boxSub}>RECIBÍ Y REVISÉ — Original para cotejar y copias</Text>
          <View style={S.docThRow}>
            <Text style={[S.docTh, { width: '6%', textAlign: 'center' }]}>#</Text>
            <Text style={[S.docTh, { flex: 1 }]}>DOCUMENTOS SOLICITADOS</Text>
            <Text style={[S.docTh, { width: '16%', textAlign: 'center' }]}>SOLICITADO</Text>
            <Text style={[S.docTh, { width: '16%', textAlign: 'center' }]}>ENTREGADO</Text>
          </View>
          {DOCS.map((d, i) => (
            <View key={i} style={i % 2 === 0 ? S.docTdRow : S.docTdRowAlt}>
              <Text style={[S.docTd, { width: '6%', textAlign: 'center', color: '#888' }]}>{i+1}</Text>
              <Text style={[S.docTd, { flex: 1 }]}>{d}</Text>
              <Text style={[S.docTd, { width: '16%', textAlign: 'center' }]}>✓</Text>
              <Text style={[S.docTd, { width: '16%', textAlign: 'center', color: '#aaa' }]}>___</Text>
            </View>
          ))}
          <Text style={S.note}>* Cuando aplique  |  ** En caso de no contar con este documento se deberá presentar la carta compromiso.</Text>
          <Text style={[S.note, { color: '#444' }]}>En caso de no tener todos los documentos solicitados, me comprometo a entregarlos antes del proceso de reinscripción.</Text>
        </View>

        {/* Firmas */}
        <View style={S.firmasRow}>
          <View style={S.firmaCell}>
            <View style={S.firmaLine} />
            <Text style={S.firmaNom}>Nombre y Firma del Aspirante</Text>
            <Text style={[S.firmaRol]}>{`${uf(asp.apellido_paterno)} ${uf(asp.apellido_materno ?? '')}, ${uf(asp.nombres)}`}</Text>
          </View>
          <View style={{ flex: 0.3 }} />
          <View style={S.firmaCell}>
            <View style={S.firmaLine} />
            <Text style={S.firmaNom}>Sello y Firma</Text>
            <Text style={S.firmaRol}>Departamento de Servicios Escolares</Text>
            <Text style={[S.firmaRol, { color: '#777' }]}>{cfg.nombre_corto}</Text>
          </View>
        </View>

        <Text style={S.footer}>{`Documento generado por SICE — ITSMT · Folio: ${folio}`}</Text>
      </Page>
    </Document>
  )
}
