import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import type { Aspirante } from '../services/admision'

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#111',
    paddingTop: 54,
    paddingBottom: 130,
    paddingHorizontal: 57,
    backgroundColor: '#fff',
  },

  // ── Encabezado ────────────────────────────────────────────
  hdrRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  hdrLogo:   { width: 46, height: 46, marginRight: 10 },
  hdrCenter: { flex: 1 },
  hdrInst:   { fontSize: 11, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  hdrDep:    { fontSize: 7.5, color: '#555', textAlign: 'center', marginTop: 3 },
  hdrMeta:   { fontSize: 6.5, color: '#777', textAlign: 'right', lineHeight: 1.8 },
  hdrRule:   { borderBottomWidth: 1.5, borderBottomColor: '#111', marginBottom: 12 },

  // ── Título ────────────────────────────────────────────────
  titleWrap: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 6,
    marginBottom: 14,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderTopColor: '#111',
    borderBottomColor: '#111',
  },
  titleText: { fontFamily: 'Helvetica-Bold', fontSize: 12, textAlign: 'center', letterSpacing: 0.8 },

  // ── Campos ────────────────────────────────────────────────
  fieldRow:   { flexDirection: 'row', marginBottom: 5 },
  fieldLabel: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, width: '32%' },
  fieldValue: { fontSize: 8.5, flex: 1 },

  // ── Subtítulo ─────────────────────────────────────────────
  periodo: { fontSize: 7, color: '#555', textAlign: 'right', marginTop: 6, marginBottom: 12 },

  // ── Tabla ─────────────────────────────────────────────────
  thead: { flexDirection: 'row', backgroundColor: '#333', paddingVertical: 5 },
  thNo:  { width: '7%',  color: '#fff', fontFamily: 'Helvetica-Bold', textAlign: 'center', paddingHorizontal: 4 },
  thAp:  { width: '26%', color: '#fff', fontFamily: 'Helvetica-Bold', paddingHorizontal: 6 },
  thAm:  { width: '23%', color: '#fff', fontFamily: 'Helvetica-Bold', paddingHorizontal: 6 },
  thNm:  { width: '27%', color: '#fff', fontFamily: 'Helvetica-Bold', paddingHorizontal: 6 },
  thFch: { width: '17%', color: '#fff', fontFamily: 'Helvetica-Bold', textAlign: 'center', paddingHorizontal: 4 },

  rowOdd:  { flexDirection: 'row', backgroundColor: '#f4f4f4', paddingVertical: 4 },
  rowEven: { flexDirection: 'row', backgroundColor: '#ffffff',  paddingVertical: 4 },
  tdNo:  { width: '7%',  textAlign: 'center', color: '#555', paddingHorizontal: 4 },
  tdAp:  { width: '26%', fontFamily: 'Helvetica-Bold', paddingHorizontal: 6 },
  tdAm:  { width: '23%', paddingHorizontal: 6 },
  tdNm:  { width: '27%', paddingHorizontal: 6 },
  tdFch: { width: '17%', textAlign: 'center', paddingHorizontal: 4 },

  rowTotal:  {
    flexDirection: 'row',
    backgroundColor: '#e8e8e8',
    paddingVertical: 4,
    borderTopWidth: 1.5,
    borderTopColor: '#555',
  },
  totLabel: { flex: 1, fontFamily: 'Helvetica-Bold', textAlign: 'right', paddingHorizontal: 6 },
  totVal:   { width: '17%', fontFamily: 'Helvetica-Bold', textAlign: 'center', paddingHorizontal: 4 },

  // ── Pie ───────────────────────────────────────────────────
  pageBottom: { position: 'absolute', bottom: 40, left: 57, right: 57 },
  firmasSep:  { borderTopWidth: 0.8, borderTopColor: '#ccc', marginBottom: 12 },
  firmasRow:  { flexDirection: 'row' },
  firmaCell:  { flex: 1, alignItems: 'center', paddingHorizontal: 20 },
  firmaSpace: { height: 36 },
  firmaLine:  { borderTopWidth: 0.8, borderTopColor: '#333', width: '100%', marginBottom: 5 },
  firmaNombre:{ fontFamily: 'Helvetica-Bold', fontSize: 8, textAlign: 'center' },
  firmaRol:   { fontSize: 7, color: '#555', textAlign: 'center', marginTop: 2 },
  firmaDate:  { fontSize: 6.5, color: '#aaa', textAlign: 'center', marginTop: 3 },
  footerRow:  { flexDirection: 'row', marginTop: 8, borderTopWidth: 0.5, borderTopColor: '#ddd', paddingTop: 4 },
  footerL:    { flex: 1, fontSize: 6.5, color: '#aaa' },
  footerR:    { fontSize: 6.5, color: '#aaa', textAlign: 'right' },
})

// ── helpers ───────────────────────────────────────────────────────────────────

const up = (s: string) => (s ?? '').toUpperCase()

function fmtFecha(iso: string) {
  const MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
                 'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE']
  const d = new Date(iso + 'T12:00:00')
  return `${d.getDate()} DE ${MESES[d.getMonth()]} DE ${d.getFullYear()}`
}

// ── Tipos ────────────────────────────────────────────────────────────────────

interface PeriodoInfo { nombre: string; fecha_inicio: string; fecha_fin: string }
interface CfgInfo {
  nombre_institucion: string
  dependencia: string | null
  clave_tecnm: string | null
  logoBase64: string | null   // base64 resuelto en el hook
}

interface Props {
  aspirantes: Aspirante[]
  periodo: PeriodoInfo
  cfg: CfgInfo
  totalCarreras: number
}

// ── Documento ─────────────────────────────────────────────────────────────────

export default function ListaAceptadosPorCarreraPdf({ aspirantes, periodo, cfg, totalCarreras }: Props) {
  const fechaInsc = `${fmtFecha(periodo.fecha_inicio)} AL ${fmtFecha(periodo.fecha_fin)}`

  const porCarrera = new Map<string, Aspirante[]>()
  for (const a of aspirantes) {
    const key = a.carrera.nombre
    if (!porCarrera.has(key)) porCarrera.set(key, [])
    porCarrera.get(key)!.push(a)
  }
  const carreras = Array.from(porCarrera.entries()).sort(([a], [b]) => a.localeCompare(b, 'es'))

  const firmas = [
    { nombre: 'Elaboró',   rol: 'Nombre y Firma' },
    { nombre: 'Autorizó',  rol: 'Subdirector(a) Académico(a)' },
  ]

  return (
    <Document title="Lista de Aspirantes Aceptados por Carrera">
      {carreras.map(([carrera, grupo], ci) => {
        const sorted = [...grupo].sort((a, b) =>
          a.apellido_paterno.localeCompare(b.apellido_paterno, 'es')
        )

        return (
          <Page key={carrera} size="LETTER" style={S.page}>

            {/* Encabezado */}
            <View style={S.hdrRow}>
              {cfg.logoBase64 && (
                <Image src={cfg.logoBase64} style={S.hdrLogo} />
              )}
              <View style={S.hdrCenter}>
                <Text style={S.hdrInst}>{cfg.nombre_institucion}</Text>
                <Text style={S.hdrDep}>{cfg.dependencia ?? 'Tecnológico Nacional de México'}</Text>
              </View>
              <Text style={S.hdrMeta}>
                {`Código: TecNM-AC-PO-001-01\nRevisión: O${cfg.clave_tecnm ? `\nClave: ${cfg.clave_tecnm}` : ''}`}
              </Text>
            </View>
            <View style={S.hdrRule} />

            {/* Título */}
            <View style={S.titleWrap}>
              <Text style={S.titleText}>LISTA DE ASPIRANTES ACEPTADOS</Text>
            </View>

            {/* Campos */}
            <View style={S.fieldRow}>
              <Text style={S.fieldLabel}>INSTITUTO TECNOLÓGICO:</Text>
              <Text style={S.fieldValue}>{up(cfg.nombre_institucion)}</Text>
            </View>
            <View style={S.fieldRow}>
              <Text style={S.fieldLabel}>CARRERA:</Text>
              <Text style={S.fieldValue}>{up(carrera)}</Text>
            </View>
            <View style={S.fieldRow}>
              <Text style={S.fieldLabel}>FECHA DE INSCRIPCIÓN:</Text>
              <Text style={S.fieldValue}>{fechaInsc}</Text>
            </View>

            {/* Periodo */}
            <Text style={S.periodo}>
              {`Periodo académico: ${up(periodo.nombre)}   |   Total en esta carrera: ${grupo.length} aspirante(s)`}
            </Text>

            {/* Tabla */}
            <View style={S.thead}>
              <Text style={S.thNo}>No.</Text>
              <Text style={S.thAp}>Apellido Paterno</Text>
              <Text style={S.thAm}>Apellido Materno</Text>
              <Text style={S.thNm}>Nombre(s)</Text>
              <Text style={S.thFch}>No. de Ficha</Text>
            </View>
            {sorted.map((asp, i) => (
              <View key={asp.id} style={i % 2 === 0 ? S.rowOdd : S.rowEven}>
                <Text style={S.tdNo}>{i + 1}</Text>
                <Text style={S.tdAp}>{up(asp.apellido_paterno)}</Text>
                <Text style={S.tdAm}>{up(asp.apellido_materno ?? '')}</Text>
                <Text style={S.tdNm}>{up(asp.nombres)}</Text>
                <Text style={S.tdFch}>{asp.folio_preinscripcion_tecnm ?? '—'}</Text>
              </View>
            ))}
            <View style={S.rowTotal}>
              <Text style={S.totLabel}>Total de aspirantes aceptados en la carrera:</Text>
              <Text style={S.totVal}>{grupo.length}</Text>
            </View>

            {/* Pie fijo */}
            <View style={S.pageBottom} fixed>
              <View style={S.firmasSep} />
              <View style={S.firmasRow}>
                {firmas.map((f) => (
                  <View key={f.nombre} style={S.firmaCell}>
                    <View style={S.firmaSpace} />
                    <View style={S.firmaLine} />
                    <Text style={S.firmaNombre}>{f.nombre}</Text>
                    <Text style={S.firmaRol}>{f.rol}</Text>
                    <Text style={S.firmaDate}>Fecha: _______________</Text>
                  </View>
                ))}
              </View>
              <View style={S.footerRow}>
                <Text style={S.footerL}>c.c.p. Departamento de Servicios Escolares.</Text>
                <Text style={S.footerR}>
                  {`TecNM-AC-PO-001-01 · Rev. O · Lista ${ci + 1} de ${totalCarreras}`}
                </Text>
              </View>
            </View>

          </Page>
        )
      })}
    </Document>
  )
}
