import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Alumno } from '../services/admision'

// CR-80 card size: 242.64 x 153.07 pt
const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica', fontSize: 7, color: '#1a1a1a',
    backgroundColor: '#fff', padding: 0,
  },
  card: {
    width: 242.64, height: 153.07,
    border: '2pt solid #1a3a5c',
    borderRadius: 6,
    margin: '0 auto',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  bandaTop: {
    backgroundColor: '#1a3a5c', paddingVertical: 5, paddingHorizontal: 8, textAlign: 'center',
  },
  bandaTopH1: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#fff', letterSpacing: 0.3 },
  bandaTopP:  { fontSize: 5.5, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  cuerpo: { flexDirection: 'row', padding: 8, gap: 8, flex: 1 },
  foto: {
    width: 58, height: 72,
    border: '0.5pt solid #aaa',
    backgroundColor: '#f5f5f5',
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 2,
  },
  fotoTxt: { fontSize: 6, color: '#888', textAlign: 'center', lineHeight: 1.4 },
  datos: { flex: 1 },
  nombre: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1a3a5c', lineHeight: 1.3, marginBottom: 4 },
  fila:   { fontSize: 6.5, color: '#333', marginBottom: 2 },
  filaLbl:{ fontFamily: 'Helvetica-Bold', color: '#1a3a5c' },
  nc:     { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#1a3a5c', letterSpacing: 0.8, marginTop: 5 },
  bandaBot: {
    backgroundColor: '#1a3a5c', paddingVertical: 3, paddingHorizontal: 8, textAlign: 'center',
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  bandaBotTxt: { fontSize: 6, color: '#fff', textAlign: 'center' },

  // Outside card
  firmaArea: { textAlign: 'center', marginTop: 20, paddingHorizontal: 36 },
  firmaLine: { borderTopWidth: 0.8, borderTopColor: '#333', marginTop: 36 },
  firmaNom:  { fontSize: 8.5, marginTop: 4 },
  firmaRol:  { fontSize: 7.5, color: '#555', marginTop: 2 },
  footer:    { fontSize: 6.5, color: '#777', textAlign: 'center', marginTop: 18, borderTopWidth: 0.5, borderTopColor: '#ddd', paddingTop: 4, paddingHorizontal: 14 },
})

interface Props {
  alumno: Alumno
}

export default function CredencialPdf({ alumno }: Props) {
  const asp = alumno.inscripcion?.aspirante
  const apellidos = [asp?.apellido_paterno, asp?.apellido_materno].filter(Boolean).join(' ')
  const nombres   = asp?.nombres ?? ''
  const periodo   = (alumno as any).periodo_ingreso?.nombre ?? ''

  return (
    <Document title={`Credencial — ${alumno.numero_control}`}>
      <Page size={[242.64, 153.07]} style={S.page}>
        <View style={S.card}>
          <View style={S.bandaTop}>
            <Text style={S.bandaTopH1}>TECNOLÓGICO NACIONAL DE MÉXICO</Text>
            <Text style={S.bandaTopP}>Instituto Tecnológico Superior de Martínez de la Torre</Text>
          </View>
          <View style={S.cuerpo}>
            <View style={S.foto}>
              <Text style={S.fotoTxt}>{'FOTO\nINFANTIL\n35x45mm'}</Text>
            </View>
            <View style={S.datos}>
              <Text style={S.nombre}>{apellidos}{'\n'}{nombres}</Text>
              <Text style={S.fila}><Text style={S.filaLbl}>Carrera: </Text>{alumno.carrera?.nombre ?? '—'}</Text>
              <Text style={S.fila}><Text style={S.filaLbl}>Semestre: </Text>{alumno.semestre_actual}°  <Text style={S.filaLbl}>Periodo: </Text>{periodo}</Text>
              <Text style={S.nc}>NC {alumno.numero_control}</Text>
            </View>
          </View>
          <View style={S.bandaBot}>
            <Text style={S.bandaBotTxt}>{`Válida para el periodo ${periodo} · ITSMT`}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
