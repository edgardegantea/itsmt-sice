import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { permanenciaApi, type EncuestaSocioeconomica, type GastosMensuales } from '../services/permanencia'
import { useAuthStore } from '../../../store/authStore'
import { useToastStore } from '../../../store/toastStore'
import apiClient from '../../../config/apiClient'

const GASTOS_LABELS: Record<keyof GastosMensuales, string> = {
  luz: 'Luz', agua: 'Agua', tel_fija: 'Tel. fija', tel_celular: 'Cel.',
  internet: 'Internet', tv_cable: 'TV cable', renta: 'Renta', transporte: 'Transporte',
  material_escolar: 'Material', salud: 'Salud', alimentacion: 'Alimentación', otros: 'Otros',
}

const INPUT = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30'
const LABEL = 'block text-xs font-medium text-slate-500 mb-1'

type EncuestaConRelaciones = EncuestaSocioeconomica & {
  alumno?: { id: string; numero_control: string; user?: { name: string }; inscripcion?: { carrera?: { nombre: string } } }
  periodo?: { id: string; nombre: string }
}

// ── Modal edición superadmin ──────────────────────────────────────────────────

function EditEncuestaModal({ enc, onClose }: { enc: EncuestaConRelaciones; onClose: () => void }) {
  const qc = useQueryClient()
  const { success, error: toastError } = useToastStore()

  const [form, setForm] = useState<Record<string, any>>({
    semestre:                   enc.semestre ?? '',
    con_quien_vive:             enc.con_quien_vive ?? '',
    tiene_beca:                 enc.tiene_beca ?? false,
    beca:                       enc.beca ?? '',
    ingreso_propio:             enc.ingreso_propio ?? '',
    // Datos personales
    dp_curp:                    enc.dp_curp ?? '',
    dp_fecha_nacimiento:        enc.dp_fecha_nacimiento ?? '',
    dp_lugar_nacimiento:        enc.dp_lugar_nacimiento ?? '',
    dp_sexo:                    enc.dp_sexo ?? '',
    dp_estado_civil:            enc.dp_estado_civil ?? '',
    dp_telefono:                enc.dp_telefono ?? '',
    dp_email:                   enc.dp_email ?? '',
    dp_municipio_procedencia:   enc.dp_municipio_procedencia ?? '',
    dp_escuela_bachillerato:    enc.dp_escuela_bachillerato ?? '',
    // Padre
    padre_nivel_educativo:      enc.padre_nivel_educativo ?? '',
    padre_situacion_laboral:    enc.padre_situacion_laboral ?? '',
    padre_ocupacion:            enc.padre_ocupacion ?? '',
    padre_centro_trabajo:       enc.padre_centro_trabajo ?? '',
    padre_ingresos_mensuales:   enc.padre_ingresos_mensuales ?? '',
    padre_otros_ingresos:       enc.padre_otros_ingresos ?? '',
    // Madre
    madre_nivel_educativo:      enc.madre_nivel_educativo ?? '',
    madre_situacion_laboral:    enc.madre_situacion_laboral ?? '',
    madre_ocupacion:            enc.madre_ocupacion ?? '',
    madre_centro_trabajo:       enc.madre_centro_trabajo ?? '',
    madre_ingresos_mensuales:   enc.madre_ingresos_mensuales ?? '',
    madre_otros_ingresos:       enc.madre_otros_ingresos ?? '',
    // Familia
    familia_total_integrantes:  enc.familia_total_integrantes ?? '',
    familia_num_hijos:          enc.familia_num_hijos ?? '',
    familia_edades_hijos:       enc.familia_edades_hijos ?? '',
    familia_num_estudiantes:    enc.familia_num_estudiantes ?? '',
    // Vivienda
    vivienda_calle:             enc.vivienda_calle ?? '',
    vivienda_numero:            enc.vivienda_numero ?? '',
    vivienda_colonia:           enc.vivienda_colonia ?? '',
    vivienda_municipio:         enc.vivienda_municipio ?? '',
    vivienda_tipo:              enc.vivienda_tipo ?? '',
    vivienda_tipo_propiedad:    enc.vivienda_tipo_propiedad ?? '',
    traslado_escuela:           enc.traslado_escuela ?? '',
    total_ingresos_familia:     enc.total_ingresos_familia ?? '',
    otros_ingresos_familia:     enc.otros_ingresos_familia ?? '',
    total_egresos_familia:      enc.total_egresos_familia ?? '',
    // Salud
    salud_estado:               enc.salud_estado ?? '',
    salud_especifique:          enc.salud_especifique ?? '',
    informacion_adicional:      enc.informacion_adicional ?? '',
  })

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: Record<string, any>) =>
      apiClient.patch(`/admin/encuestas-socioeconomicas/${enc.id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['encuestas-admin'] })
      success('Encuesta actualizada correctamente.')
      onClose()
    },
    onError: () => toastError('Error al actualizar la encuesta.'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: Record<string, any> = { periodo_id: enc.periodo_id ?? enc.periodo?.id }
    for (const [k, v] of Object.entries(form)) {
      payload[k] = v === '' ? null : v
    }
    mutate(payload)
  }

  const alumno = enc.alumno
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="font-semibold text-slate-900">Editar encuesta — {alumno?.user?.name ?? 'Alumno'}</h2>
            <p className="text-xs text-slate-500">{alumno?.numero_control} · {enc.periodo?.nombre}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-sm">

          <Section title="I. Datos personales">
            <Field label="CURP"><input value={form.dp_curp} onChange={set('dp_curp')} className={`${INPUT} font-mono uppercase`} maxLength={18} /></Field>
            <Field label="Fecha nacimiento"><input type="date" value={form.dp_fecha_nacimiento} onChange={set('dp_fecha_nacimiento')} className={INPUT} /></Field>
            <Field label="Lugar de nacimiento"><input value={form.dp_lugar_nacimiento} onChange={set('dp_lugar_nacimiento')} className={INPUT} /></Field>
            <Field label="Sexo">
              <select value={form.dp_sexo} onChange={set('dp_sexo')} className={`${INPUT} bg-white`}>
                <option value="">—</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
              </select>
            </Field>
            <Field label="Estado civil"><input value={form.dp_estado_civil} onChange={set('dp_estado_civil')} className={INPUT} /></Field>
            <Field label="Teléfono"><input value={form.dp_telefono} onChange={set('dp_telefono')} className={INPUT} /></Field>
            <Field label="Email"><input type="email" value={form.dp_email} onChange={set('dp_email')} className={INPUT} /></Field>
            <Field label="Municipio de procedencia"><input value={form.dp_municipio_procedencia} onChange={set('dp_municipio_procedencia')} className={INPUT} /></Field>
            <Field label="Escuela bachillerato" wide><input value={form.dp_escuela_bachillerato} onChange={set('dp_escuela_bachillerato')} className={INPUT} /></Field>
          </Section>

          <Section title="II. Situación del alumno">
            <Field label="Semestre"><input type="number" min={1} max={12} value={form.semestre} onChange={set('semestre')} className={INPUT} /></Field>
            <Field label="Con quién vive"><input value={form.con_quien_vive} onChange={set('con_quien_vive')} className={INPUT} /></Field>
            <Field label="Beca / apoyo"><input value={form.beca} onChange={set('beca')} className={INPUT} /></Field>
            <Field label="Ingreso propio"><input value={form.ingreso_propio} onChange={set('ingreso_propio')} className={INPUT} /></Field>
          </Section>

          <Section title="III. Padre / Tutor">
            <Field label="Nivel educativo"><input value={form.padre_nivel_educativo} onChange={set('padre_nivel_educativo')} className={INPUT} /></Field>
            <Field label="Situación laboral"><input value={form.padre_situacion_laboral} onChange={set('padre_situacion_laboral')} className={INPUT} /></Field>
            <Field label="Ocupación"><input value={form.padre_ocupacion} onChange={set('padre_ocupacion')} className={INPUT} /></Field>
            <Field label="Centro de trabajo"><input value={form.padre_centro_trabajo} onChange={set('padre_centro_trabajo')} className={INPUT} /></Field>
            <Field label="Ingresos mensuales"><input type="number" min={0} value={form.padre_ingresos_mensuales} onChange={set('padre_ingresos_mensuales')} className={INPUT} /></Field>
            <Field label="Otros ingresos"><input value={form.padre_otros_ingresos} onChange={set('padre_otros_ingresos')} className={INPUT} /></Field>
          </Section>

          <Section title="IV. Madre">
            <Field label="Nivel educativo"><input value={form.madre_nivel_educativo} onChange={set('madre_nivel_educativo')} className={INPUT} /></Field>
            <Field label="Situación laboral"><input value={form.madre_situacion_laboral} onChange={set('madre_situacion_laboral')} className={INPUT} /></Field>
            <Field label="Ocupación"><input value={form.madre_ocupacion} onChange={set('madre_ocupacion')} className={INPUT} /></Field>
            <Field label="Centro de trabajo"><input value={form.madre_centro_trabajo} onChange={set('madre_centro_trabajo')} className={INPUT} /></Field>
            <Field label="Ingresos mensuales"><input type="number" min={0} value={form.madre_ingresos_mensuales} onChange={set('madre_ingresos_mensuales')} className={INPUT} /></Field>
            <Field label="Otros ingresos"><input value={form.madre_otros_ingresos} onChange={set('madre_otros_ingresos')} className={INPUT} /></Field>
          </Section>

          <Section title="V. Familia">
            <Field label="Total integrantes"><input type="number" min={0} value={form.familia_total_integrantes} onChange={set('familia_total_integrantes')} className={INPUT} /></Field>
            <Field label="Núm. hijos"><input type="number" min={0} value={form.familia_num_hijos} onChange={set('familia_num_hijos')} className={INPUT} /></Field>
            <Field label="Edades de hijos"><input value={form.familia_edades_hijos} onChange={set('familia_edades_hijos')} className={INPUT} /></Field>
            <Field label="Hijos estudiando"><input type="number" min={0} value={form.familia_num_estudiantes} onChange={set('familia_num_estudiantes')} className={INPUT} /></Field>
          </Section>

          <Section title="VI. Vivienda e ingresos">
            <Field label="Calle"><input value={form.vivienda_calle} onChange={set('vivienda_calle')} className={INPUT} /></Field>
            <Field label="Número"><input value={form.vivienda_numero} onChange={set('vivienda_numero')} className={INPUT} /></Field>
            <Field label="Colonia"><input value={form.vivienda_colonia} onChange={set('vivienda_colonia')} className={INPUT} /></Field>
            <Field label="Municipio"><input value={form.vivienda_municipio} onChange={set('vivienda_municipio')} className={INPUT} /></Field>
            <Field label="Tipo de vivienda"><input value={form.vivienda_tipo} onChange={set('vivienda_tipo')} className={INPUT} /></Field>
            <Field label="Tipo de propiedad"><input value={form.vivienda_tipo_propiedad} onChange={set('vivienda_tipo_propiedad')} className={INPUT} /></Field>
            <Field label="Traslado a escuela"><input value={form.traslado_escuela} onChange={set('traslado_escuela')} className={INPUT} /></Field>
            <Field label="Total ingresos familia"><input type="number" min={0} value={form.total_ingresos_familia} onChange={set('total_ingresos_familia')} className={INPUT} /></Field>
            <Field label="Otros ingresos familia"><input type="number" min={0} value={form.otros_ingresos_familia} onChange={set('otros_ingresos_familia')} className={INPUT} /></Field>
            <Field label="Total egresos familia"><input type="number" min={0} value={form.total_egresos_familia} onChange={set('total_egresos_familia')} className={INPUT} /></Field>
          </Section>

          <Section title="VII. Salud">
            <Field label="Estado de salud"><input value={form.salud_estado} onChange={set('salud_estado')} className={INPUT} /></Field>
            <Field label="Especifique" wide><input value={form.salud_especifique} onChange={set('salud_especifique')} className={INPUT} /></Field>
          </Section>

          <div>
            <label className={LABEL}>VIII. Información adicional</label>
            <textarea rows={4} value={form.informacion_adicional} onChange={set('informacion_adicional')} className={`${INPUT} resize-none`} />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#234d7a] disabled:opacity-60 rounded-lg">
              {isPending ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <label className={LABEL}>{label}</label>
      {children}
    </div>
  )
}

// ── Modal detalle (solo lectura) ──────────────────────────────────────────────

function DetailModal({ enc, onClose }: { enc: EncuestaConRelaciones; onClose: () => void }) {
  const alumno = enc.alumno
  const periodo = enc.periodo
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="font-semibold text-slate-900">{alumno?.user?.name ?? 'Alumno'}</h2>
            <p className="text-xs text-slate-500">{alumno?.numero_control} · {alumno?.inscripcion?.carrera?.nombre} · {periodo?.nombre}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-6 text-sm">
          <Bloque title="I. Datos del alumno">
            <Row label="Semestre" value={enc.semestre} />
            <Row label="Con quién vive" value={enc.con_quien_vive} />
            <Row label="Beca" value={enc.tiene_beca ? enc.beca || 'Sí' : 'No'} />
            <Row label="Ingreso propio" value={enc.ingreso_propio} />
          </Bloque>
          <Bloque title="III. Padre / Tutor">
            <Row label="Nivel educativo" value={enc.padre_nivel_educativo} />
            <Row label="Situación laboral" value={enc.padre_situacion_laboral} />
            <Row label="Ocupación" value={enc.padre_ocupacion} />
            <Row label="Centro de trabajo" value={enc.padre_centro_trabajo} />
            <Row label="Ingresos mensuales" value={enc.padre_ingresos_mensuales != null ? `$${Number(enc.padre_ingresos_mensuales).toLocaleString()}` : undefined} />
          </Bloque>
          <Bloque title="IV. Madre">
            <Row label="Nivel educativo" value={enc.madre_nivel_educativo} />
            <Row label="Situación laboral" value={enc.madre_situacion_laboral} />
            <Row label="Ocupación" value={enc.madre_ocupacion} />
            <Row label="Centro de trabajo" value={enc.madre_centro_trabajo} />
            <Row label="Ingresos mensuales" value={enc.madre_ingresos_mensuales != null ? `$${Number(enc.madre_ingresos_mensuales).toLocaleString()}` : undefined} />
          </Bloque>
          <Bloque title="V. Familia">
            <Row label="Integrantes" value={enc.familia_total_integrantes} />
            <Row label="Hijos" value={enc.familia_num_hijos} />
            <Row label="Edades hijos" value={enc.familia_edades_hijos} />
            <Row label="Hijos estudiando" value={enc.familia_num_estudiantes} />
          </Bloque>
          <Bloque title="VI. Vivienda">
            <Row label="Dirección" value={[enc.vivienda_calle, enc.vivienda_numero, enc.vivienda_colonia, enc.vivienda_municipio].filter(Boolean).join(', ')} />
            <Row label="Tipo vivienda" value={enc.vivienda_tipo} />
            <Row label="Tipo propiedad" value={enc.vivienda_tipo_propiedad} />
            <Row label="Otras propiedades" value={enc.vivienda_otras_propiedades} />
            <Row label="Vehículo" value={enc.tiene_vehiculo ? (enc.vehiculos ?? []).map(v => `${v.tipo} ${v.marca} ${v.anio}`).join(', ') || 'Sí' : 'No'} />
            <Row label="Traslado a escuela" value={enc.traslado_escuela} />
            <Row label="Ingresos familia" value={enc.total_ingresos_familia != null ? `$${Number(enc.total_ingresos_familia).toLocaleString()}` : undefined} />
            <Row label="Otros ingresos" value={enc.otros_ingresos_familia != null ? `$${Number(enc.otros_ingresos_familia).toLocaleString()}` : undefined} />
            <Row label="Total egresos" value={enc.total_egresos_familia != null ? `$${Number(enc.total_egresos_familia).toLocaleString()}` : undefined} />
          </Bloque>
          {enc.gastos_mensuales && Object.keys(enc.gastos_mensuales).length > 0 && (
            <Bloque title="Gastos mensuales detallados">
              {(Object.keys(GASTOS_LABELS) as Array<keyof GastosMensuales>).map(k =>
                enc.gastos_mensuales![k] != null ? (
                  <Row key={k} label={GASTOS_LABELS[k]} value={`$${Number(enc.gastos_mensuales![k]).toLocaleString()}`} />
                ) : null
              )}
            </Bloque>
          )}
          <Bloque title="VII. Salud">
            <Row label="Estado de salud" value={enc.salud_estado} />
            <Row label="Problema familiar" value={enc.salud_problema_familiar ? enc.salud_especifique || 'Sí' : 'No'} />
          </Bloque>
          {enc.informacion_adicional && (
            <Bloque title="VIII. Información adicional">
              <p className="text-slate-700 col-span-2">{enc.informacion_adicional}</p>
            </Bloque>
          )}
        </div>
      </div>
    </div>
  )
}

function Bloque({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{title}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: unknown }) {
  if (value == null || value === '') return null
  return (
    <>
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900 font-medium">{String(value)}</span>
    </>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function EncuestasAdminPage() {
  const { user } = useAuthStore()
  const esSuperadmin = user?.roles?.includes('superadmin') ?? false

  const [filtroEnviada, setFiltroEnviada] = useState<'todas' | 'enviadas' | 'borradores'>('todas')
  const [selected, setSelected] = useState<any | null>(null)
  const [editando, setEditando] = useState<any | null>(null)

  const params: Record<string, string> = {}
  if (filtroEnviada === 'enviadas')   params.enviada = 'true'
  if (filtroEnviada === 'borradores') params.enviada = 'false'

  const { data, isLoading } = useQuery({
    queryKey: ['encuestas-admin', filtroEnviada],
    queryFn: () => permanenciaApi.getEncuestas(params),
  })

  const encuestas: EncuestaConRelaciones[] = data?.data ?? []

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Encuestas Socioeconómicas</h1>
          <p className="text-sm text-slate-500 mt-1">Resumen de encuestas enviadas por los alumnos</p>
        </div>
        <div className="flex gap-2">
          {(['todas', 'enviadas', 'borradores'] as const).map(f => (
            <button key={f} onClick={() => setFiltroEnviada(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${filtroEnviada === f ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-slate-400 text-sm">Cargando…</p>
      ) : encuestas.length === 0 ? (
        <p className="text-slate-400 text-sm">Sin encuestas registradas.</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Alumno</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">N° Control</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Carrera</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Periodo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Semestre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Estatus</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {encuestas.map((enc) => (
                <tr key={enc.id} className="hover:bg-blue-50/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{enc.alumno?.user?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono">{enc.alumno?.numero_control ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{enc.alumno?.inscripcion?.carrera?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{enc.periodo?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{enc.semestre}°</td>
                  <td className="px-4 py-3">
                    {enc.enviada_at ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Enviada</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Borrador</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {esSuperadmin && (
                        <button
                          onClick={() => setEditando(enc)}
                          className="text-[#1a3a5c] hover:underline text-xs font-medium"
                        >
                          Editar
                        </button>
                      )}
                      <button
                        onClick={() => setSelected(enc)}
                        className="text-blue-600 hover:underline text-xs font-medium"
                      >
                        Ver detalle
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <DetailModal enc={selected} onClose={() => setSelected(null)} />}
      {editando && <EditEncuestaModal enc={editando} onClose={() => setEditando(null)} />}
    </div>
  )
}
