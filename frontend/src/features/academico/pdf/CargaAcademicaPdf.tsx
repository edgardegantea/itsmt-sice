import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'

const s = StyleSheet.create({
  page:      { fontFamily: 'Helvetica', fontSize: 9, color: '#1a1a1a', padding: '1.5cm 2cm' },
  header:    { flexDirection: 'row', alignItems: 'center', marginBottom: 14, borderBottom: '1.5 solid #1a3a5c', paddingBottom: 10 },
  logo:      { width: 48, height: 48, objectFit: 'contain', marginRight: 14 },
  inst:      { flex: 1 },
  instName:  { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1a3a5c' },
  instSub:   { fontSize: 8, color: '#555', marginTop: 2 },
  docTitle:  { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1a3a5c', textAlign: 'center', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  docSub:    { fontSize: 8.5, color: '#666', textAlign: 'center', marginBottom: 16 },
  sectionHdr:{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1a3a5c', borderBottom: '0.5 solid #1a3a5c', paddingBottom: 3, marginTop: 14, marginBottom: 6 },
  row2:      { flexDirection: 'row', gap: 12, marginBottom: 4 },
  label:     { fontSize: 8, color: '#666', marginBottom: 1 },
  value:     { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  field:     { flex: 1 },
  // Tabla de asignaturas
  tHead:     { flexDirection: 'row', backgroundColor: '#1a3a5c', paddingVertical: 4, paddingHorizontal: 4, borderRadius: 2, marginTop: 8 },
  thCell:    { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#fff' },
  tRow:      { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 4, borderBottom: '0.3 solid #e5e7eb' },
  tdCell:    { fontSize: 8 },
  colNombre: { flex: 3 },
  colClave:  { flex: 1.4 },
  colGrupo:  { flex: 1 },
  colCred:   { flex: 0.7, textAlign: 'center' },
  colHrs:    { flex: 0.8, textAlign: 'center' },
  colHorario:{ flex: 3 },
  colDocente:{ flex: 2.5 },
  // Firmas
  firmas:    { flexDirection: 'row', justifyContent: 'space-around', marginTop: 40 },
  firma:     { alignItems: 'center', width: 150 },
  firmaLine: { borderTop: '1 solid #333', width: 130, marginBottom: 4 },
  firmaNom:  { fontSize: 8.5, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  firmaRol:  { fontSize: 7.5, color: '#555', textAlign: 'center' },
  nota:      { fontSize: 7, color: '#888', textAlign: 'center', marginTop: 20 },
})

const DIAS_CORTO: Record<string, string> = {
  lunes: 'L', martes: 'Ma', miercoles: 'Mi', jueves: 'J', viernes: 'V', sabado: 'S',
}

function fmtHorario(horarios: any[]): string {
  return horarios.map(h =>
    `${DIAS_CORTO[h.dia_semana] ?? h.dia_semana} ${h.hora_inicio.slice(0,5)}–${h.hora_fin.slice(0,5)}`
  ).join(', ')
}

interface Asignatura {
  id: string
  materia: { nombre: string; clave: string; clave_oficial_tecnm?: string; creditos: number; horas_teoria?: number; horas_practica?: number }
  grupo: { clave: string }
  docente: { name: string }
  aula?: { nombre: string }
  horarios: { dia_semana: string; hora_inicio: string; hora_fin: string }[]
  es_repeticion?: boolean
}

interface Props {
  alumno: {
    numero_control: string
    semestre_actual: number
    carrera?: { nombre: string; clave: string }
    user?: { name: string }
    inscripcion?: { tipo_ingreso?: string; plan_estudios?: string; especialidad?: string }
  }
  periodo: { nombre: string }
  asignaturas: Asignatura[]
  configuracion?: { nombre_institucion?: string; logo_base64?: string }
  firmantes?: { jefe_division?: string; nombre_director?: string }
}

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

export default function CargaAcademicaPdf({ alumno, periodo, asignaturas, configuracion, firmantes }: Props) {
  const hoy = new Date()
  const fechaStr = `${hoy.getDate()} de ${MESES[hoy.getMonth()]} de ${hoy.getFullYear()}`
  const totalCreditos = asignaturas.reduce((s, a) => s + (a.materia?.creditos ?? 0), 0)
  const totalHoras = asignaturas.reduce((s, a) => s + (a.materia?.horas_teoria ?? 0) + (a.materia?.horas_practica ?? 0), 0)

  return (
    <Document title={`Carga Académica — ${alumno.numero_control} — ${periodo.nombre}`}>
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* Encabezado */}
        <View style={s.header}>
          {configuracion?.logo_base64 ? (
            <Image src={configuracion.logo_base64} style={s.logo} />
          ) : null}
          <View style={s.inst}>
            <Text style={s.instName}>{configuracion?.nombre_institucion ?? 'Instituto Tecnológico Superior'}</Text>
            <Text style={s.instSub}>División de Estudios Profesionales</Text>
          </View>
          <View>
            <Text style={{ fontSize: 7, color: '#888', textAlign: 'right' }}>Formato TecNM-AC-PO-001</Text>
            <Text style={{ fontSize: 7, color: '#888', textAlign: 'right' }}>Fecha: {fechaStr}</Text>
          </View>
        </View>

        {/* Título */}
        <Text style={s.docTitle}>Formato de Carga Académica</Text>

        {/* Datos del alumno */}
        <Text style={s.sectionHdr}>Datos del alumno</Text>
        <View style={s.row2}>
          <View style={s.field}>
            <Text style={s.label}>Nombre completo</Text>
            <Text style={s.value}>{alumno.user?.name ?? '—'}</Text>
          </View>
          <View style={s.field}>
            <Text style={s.label}>Número de control</Text>
            <Text style={s.value}>{alumno.numero_control}</Text>
          </View>
          <View style={s.field}>
            <Text style={s.label}>Carrera</Text>
            <Text style={s.value}>{alumno.carrera?.nombre ?? '—'}</Text>
          </View>
        </View>
        <View style={s.row2}>
          <View style={s.field}>
            <Text style={s.label}>Semestre</Text>
            <Text style={s.value}>{alumno.semestre_actual}</Text>
          </View>
          <View style={s.field}>
            <Text style={s.label}>Especialidad</Text>
            <Text style={s.value}>{alumno.inscripcion?.especialidad ?? '—'}</Text>
          </View>
          <View style={s.field}>
            <Text style={s.label}>Plan de estudios</Text>
            <Text style={s.value}>{alumno.inscripcion?.plan_estudios ?? '—'}</Text>
          </View>
          <View style={s.field}>
            <Text style={s.label}>Periodo</Text>
            <Text style={s.value}>{periodo.nombre}</Text>
          </View>
        </View>

        {/* Tabla de asignaturas */}
        <Text style={s.sectionHdr}>Asignaturas inscritas</Text>
        <View style={s.tHead}>
          <Text style={[s.thCell, s.colNombre]}>Asignatura</Text>
          <Text style={[s.thCell, s.colClave]}>Clave TecNM</Text>
          <Text style={[s.thCell, s.colGrupo]}>Grupo</Text>
          <Text style={[s.thCell, s.colCred]}>Créd.</Text>
          <Text style={[s.thCell, s.colHrs]}>Hrs/sem</Text>
          <Text style={[s.thCell, s.colHorario]}>Horario</Text>
          <Text style={[s.thCell, s.colDocente]}>Docente / Aula</Text>
        </View>
        {asignaturas.map((a, i) => (
          <View key={a.id} style={[s.tRow, i % 2 === 1 ? { backgroundColor: '#f8fafc' } : {}]}>
            <Text style={[s.tdCell, s.colNombre]}>
              {a.materia.nombre}{a.es_repeticion ? ' *' : ''}
            </Text>
            <Text style={[s.tdCell, s.colClave]}>{a.materia.clave_oficial_tecnm ?? a.materia.clave}</Text>
            <Text style={[s.tdCell, s.colGrupo]}>{a.grupo.clave}</Text>
            <Text style={[s.tdCell, s.colCred]}>{a.materia.creditos}</Text>
            <Text style={[s.tdCell, s.colHrs]}>{(a.materia.horas_teoria ?? 0) + (a.materia.horas_practica ?? 0)}</Text>
            <Text style={[s.tdCell, s.colHorario]}>{fmtHorario(a.horarios)}</Text>
            <Text style={[s.tdCell, s.colDocente]}>
              {a.docente.name}{a.aula ? ` / ${a.aula.nombre}` : ''}
            </Text>
          </View>
        ))}

        {/* Totales */}
        <View style={[s.tRow, { backgroundColor: '#f1f5f9', fontFamily: 'Helvetica-Bold' }]}>
          <Text style={[s.tdCell, s.colNombre, { fontFamily: 'Helvetica-Bold' }]}>Total</Text>
          <Text style={[s.tdCell, s.colClave]}></Text>
          <Text style={[s.tdCell, s.colGrupo]}></Text>
          <Text style={[s.tdCell, s.colCred, { fontFamily: 'Helvetica-Bold' }]}>{totalCreditos}</Text>
          <Text style={[s.tdCell, s.colHrs, { fontFamily: 'Helvetica-Bold' }]}>{totalHoras}</Text>
          <Text style={[s.tdCell, s.colHorario]}></Text>
          <Text style={[s.tdCell, s.colDocente]}></Text>
        </View>

        {asignaturas.some(a => a.es_repeticion) && (
          <Text style={{ fontSize: 7.5, color: '#666', marginTop: 4 }}>* Materia en condición de repetición.</Text>
        )}

        {/* Firmas */}
        <View style={s.firmas}>
          <View style={s.firma}>
            <View style={s.firmaLine} />
            <Text style={s.firmaNom}>{firmantes?.jefe_division ?? 'Jefe de la División de Estudios Profesionales'}</Text>
            <Text style={s.firmaRol}>División de Estudios Profesionales</Text>
          </View>
          <View style={s.firma}>
            <View style={s.firmaLine} />
            <Text style={s.firmaNom}>{alumno.user?.name ?? 'Alumno'}</Text>
            <Text style={s.firmaRol}>Alumno — {alumno.numero_control}</Text>
          </View>
        </View>

        <Text style={s.nota}>
          Documento generado el {fechaStr} · TecNM-AC-PO-001 · Tecnológico Nacional de México
        </Text>
      </Page>
    </Document>
  )
}
