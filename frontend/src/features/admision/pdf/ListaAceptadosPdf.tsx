import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import type { Aspirante, Periodo } from '../services/admision'

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica', fontSize: 8, color: '#111',
    paddingTop: 50, paddingBottom: 60, paddingHorizontal: 54,
    backgroundColor: '#fff',
  },
  hdrRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  hdrLogo:   { width: 42, height: 42, marginRight: 8 },
  hdrCenter: { flex: 1 },
  hdrInst:   { fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'center', color: '#1a3a5c' },
  hdrSub:    { fontSize: 7, color: '#555', textAlign: 'center', marginTop: 2 },
  hdrMeta:   { fontSize: 6.5, color: '#777', textAlign: 'right', lineHeight: 1.7 },
  hdrRule:   { borderBottomWidth: 1.5, borderBottomColor: '#1a3a5c', marginBottom: 8 },

  fieldRow:  { flexDirection: 'row', marginBottom: 3 },
  fieldLbl:  { fontFamily: 'Helvetica-Bold', fontSize: 7.5, width: '22%', color: '#1a3a5c' },
  fieldVal:  { fontSize: 7.5, flex: 1, borderBottomWidth: 0.5, borderBottomColor: '#999', paddingBottom: 1 },

  titleBox:  { backgroundColor: '#1a3a5c', paddingVertical: 5, marginVertical: 8, textAlign: 'center' },
  titleTxt:  { fontFamily: 'Helvetica-Bold', fontSize: 10, color: '#fff', textAlign: 'center', letterSpacing: 0.5 },

  subLine:   { fontSize: 7, color: '#555', textAlign: 'right', marginBottom: 6 },

  grpHdr:    { backgroundColor: '#eef3f8', borderLeftWidth: 2.5, borderLeftColor: '#1a3a5c', paddingVertical: 3, paddingHorizontal: 6, marginTop: 8, marginBottom: 3 },
  grpTxt:    { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: '#1a3a5c' },

  thead:  { flexDirection: 'row', backgroundColor: '#1a3a5c', paddingVertical: 4 },
  thCell: { color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 6.5, paddingHorizontal: 3 },

  rowOdd:   { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 3, borderBottomWidth: 0.3, borderBottomColor: '#e2e8f0' },
  rowEven:  { flexDirection: 'row', backgroundColor: '#fff',    paddingVertical: 3, borderBottomWidth: 0.3, borderBottomColor: '#e2e8f0' },
  rowTotal: { flexDirection: 'row', backgroundColor: '#e8f0f7', paddingVertical: 3, borderTopWidth: 0.8, borderTopColor: '#b0c4d8' },
  tdCell:   { fontSize: 6.5, paddingHorizontal: 3 },
  tdBold:   { fontFamily: 'Helvetica-Bold', fontSize: 6.5, paddingHorizontal: 3 },

  firmasRow:  { flexDirection: 'row', marginTop: 20 },
  firmaCell:  { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  firmaLine:  { borderTopWidth: 0.8, borderTopColor: '#333', width: '90%', marginBottom: 3, marginTop: 36 },
  firmaNom:   { fontFamily: 'Helvetica-Bold', fontSize: 7.5, textAlign: 'center', color: '#1a3a5c' },
  firmaRol:   { fontSize: 6.5, color: '#555', textAlign: 'center', marginTop: 2 },
  firmaDate:  { fontSize: 6, color: '#aaa', textAlign: 'center', marginTop: 2 },

  ccpLine:   { fontSize: 6.5, color: '#888', marginTop: 8 },
})

const wNo  = '4%'
const wAp  = '14%'
const wAm  = '14%'
const wNm  = '16%'
const wFch = '9%'
const wCurp= '13%'
const wProm= '7%'
const wEx  = '7%'
const wTur = '7%'
const wRem = '9%'

interface Props {
  aspirantes: (Aspirante & { folio_preinscripcion_tecnm?: string | null; folio_exani?: string | null; puntaje_exani?: number | null })[]
  periodo: Pick<Periodo, 'nombre' | 'fecha_inicio' | 'fecha_fin'>
  cfg: { nombre_institucion: string; dependencia: string | null; clave_tecnm: string | null; logoBase64: string | null }
}

export default function ListaAceptadosPdf({ aspirantes, periodo, cfg }: Props) {
  const today = new Date().toLocaleDateString('es-MX', { day:'2-digit', month:'2-digit', year:'numeric' })
  const fechaInsc = `${new Date(periodo.fecha_inicio + 'T12:00:00').toLocaleDateString('es-MX')} al ${new Date(periodo.fecha_fin + 'T12:00:00').toLocaleDateString('es-MX')}`

  const porCarrera = new Map<string, typeof aspirantes>()
  for (const a of aspirantes) {
    const key = a.carrera.nombre
    if (!porCarrera.has(key)) porCarrera.set(key, [])
    porCarrera.get(key)!.push(a)
  }
  const carreras = Array.from(porCarrera.entries()).sort(([a],[b]) => a.localeCompare(b,'es'))

  return (
    <Document title="Lista de Aspirantes Aceptados">
      <Page size="LETTER" orientation="landscape" style={S.page}>
        {/* Header */}
        <View style={S.hdrRow}>
          {cfg.logoBase64 && <Image src={cfg.logoBase64} style={S.hdrLogo} />}
          <View style={S.hdrCenter}>
            <Text style={S.hdrInst}>{cfg.nombre_institucion}</Text>
            <Text style={S.hdrSub}>{cfg.dependencia ?? 'Tecnológico Nacional de México'}</Text>
          </View>
          <Text style={S.hdrMeta}>{`Código: TecNM-AC-PO-001-01\nRevisión: O${cfg.clave_tecnm ? `\nClave: ${cfg.clave_tecnm}` : ''}`}</Text>
        </View>
        <View style={S.hdrRule} />

        {/* Campos */}
        <View style={S.fieldRow}><Text style={S.fieldLbl}>INSTITUTO TECNOLÓGICO:</Text><Text style={S.fieldVal}>{cfg.nombre_institucion.toUpperCase()}</Text></View>
        <View style={S.fieldRow}><Text style={S.fieldLbl}>PERIODO:</Text><Text style={S.fieldVal}>{periodo.nombre.toUpperCase()}</Text></View>
        <View style={S.fieldRow}><Text style={S.fieldLbl}>FECHA DE INSCRIPCIÓN:</Text><Text style={S.fieldVal}>{fechaInsc}</Text></View>

        {/* Título */}
        <View style={S.titleBox}>
          <Text style={S.titleTxt}>LISTA DE ASPIRANTES ACEPTADOS</Text>
        </View>

        <Text style={S.subLine}>{`Código: TecNM-AC-PO-001-01  ·  Rev. O  ·  Total aspirantes aceptados: ${aspirantes.length}  ·  ${today}`}</Text>

        {/* Tabla por carrera */}
        {carreras.map(([carrera, grupo]) => {
          const sorted = [...grupo].sort((a,b) => a.apellido_paterno.localeCompare(b.apellido_paterno,'es'))
          return (
            <View key={carrera}>
              <View style={S.grpHdr}>
                <Text style={S.grpTxt}>{`CARRERA: ${carrera.toUpperCase()}  —  ${grupo.length} aspirante(s)`}</Text>
              </View>
              <View style={S.thead}>
                <Text style={[S.thCell, { width: wNo }]}>No.</Text>
                <Text style={[S.thCell, { width: wAp }]}>Ap. Paterno</Text>
                <Text style={[S.thCell, { width: wAm }]}>Ap. Materno</Text>
                <Text style={[S.thCell, { width: wNm }]}>Nombre(s)</Text>
                <Text style={[S.thCell, { width: wFch }]}>No. Ficha</Text>
                <Text style={[S.thCell, { width: wCurp }]}>CURP</Text>
                <Text style={[S.thCell, { width: wProm }]}>Promedio</Text>
                <Text style={[S.thCell, { width: wEx }]}>EXANI-II</Text>
                <Text style={[S.thCell, { width: wTur }]}>Turno</Text>
                <Text style={[S.thCell, { width: wRem }]}></Text>
              </View>
              {sorted.map((a, i) => (
                <View key={a.id} style={i % 2 === 0 ? S.rowOdd : S.rowEven}>
                  <Text style={[S.tdCell, { width: wNo, textAlign: 'center', color: '#888' }]}>{i+1}</Text>
                  <Text style={[S.tdBold, { width: wAp }]}>{a.apellido_paterno.toUpperCase()}</Text>
                  <Text style={[S.tdCell, { width: wAm }]}>{(a.apellido_materno ?? '').toUpperCase()}</Text>
                  <Text style={[S.tdCell, { width: wNm }]}>{a.nombres.toUpperCase()}</Text>
                  <Text style={[S.tdCell, { width: wFch, textAlign: 'center', fontFamily: 'Helvetica' }]}>{a.folio_preinscripcion_tecnm ?? '—'}</Text>
                  <Text style={[S.tdCell, { width: wCurp, textAlign: 'center', fontSize: 6 }]}>{a.curp}</Text>
                  <Text style={[S.tdCell, { width: wProm, textAlign: 'center' }]}>{a.promedio_bachillerato?.toFixed(1)}</Text>
                  <Text style={[S.tdCell, { width: wEx, textAlign: 'center' }]}>{a.puntaje_exani ? Math.round(a.puntaje_exani).toString() : '—'}</Text>
                  <Text style={[S.tdCell, { width: wTur, textAlign: 'center', fontSize: 6.5 }]}>{a.turno_preferido}</Text>
                  <Text style={[S.tdCell, { width: wRem }]}></Text>
                </View>
              ))}
              <View style={S.rowTotal}>
                <Text style={[S.tdBold, { flex: 1, textAlign: 'right', color: '#1a3a5c' }]}>Total carrera: {grupo.length}</Text>
              </View>
            </View>
          )
        })}

        {/* Firmas */}
        <View style={S.firmasRow}>
          {(['Elaboró','Autorizó','Recibió'] as const).map((f, i) => (
            <View key={f} style={S.firmaCell}>
              <View style={S.firmaLine} />
              <Text style={S.firmaNom}>{f}</Text>
              <Text style={S.firmaRol}>{i === 0 ? 'Nombre y Firma' : i === 1 ? 'Subdirector(a) Académico(a)' : 'Jefe(a) de Servicios Escolares'}</Text>
              <Text style={S.firmaDate}>Fecha: _______________</Text>
            </View>
          ))}
        </View>

        <Text style={S.ccpLine}>c.c.p. Departamento de Servicios Escolares.</Text>
      </Page>
    </Document>
  )
}
