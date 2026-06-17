import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { permanenciaApi, type EncuestaSocioeconomica, type GastosMensuales } from '../services/permanencia'

const GASTOS_LABELS: Record<keyof GastosMensuales, string> = {
  luz: 'Luz', agua: 'Agua', tel_fija: 'Tel. fija', tel_celular: 'Cel.',
  internet: 'Internet', tv_cable: 'TV cable', renta: 'Renta', transporte: 'Transporte',
  material_escolar: 'Material', salud: 'Salud', alimentacion: 'Alimentación', otros: 'Otros',
}

function DetailModal({ enc, onClose }: { enc: EncuestaSocioeconomica & { alumno?: any; periodo?: any }; onClose: () => void }) {
  const alumno = (enc as any).alumno
  const periodo = (enc as any).periodo
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
          {/* I */}
          <Bloque title="I. Datos del alumno">
            <Row label="Semestre" value={enc.semestre} />
            <Row label="Con quién vive" value={enc.con_quien_vive} />
            <Row label="Beca" value={enc.tiene_beca ? enc.beca || 'Sí' : 'No'} />
            <Row label="Ingreso propio" value={enc.ingreso_propio} />
          </Bloque>
          {/* III Padre */}
          <Bloque title="III. Padre / Tutor">
            <Row label="Nivel educativo" value={enc.padre_nivel_educativo} />
            <Row label="Situación laboral" value={enc.padre_situacion_laboral} />
            <Row label="Ocupación" value={enc.padre_ocupacion} />
            <Row label="Centro de trabajo" value={enc.padre_centro_trabajo} />
            <Row label="Ingresos mensuales" value={enc.padre_ingresos_mensuales != null ? `$${Number(enc.padre_ingresos_mensuales).toLocaleString()}` : undefined} />
          </Bloque>
          {/* IV Madre */}
          <Bloque title="IV. Madre">
            <Row label="Nivel educativo" value={enc.madre_nivel_educativo} />
            <Row label="Situación laboral" value={enc.madre_situacion_laboral} />
            <Row label="Ocupación" value={enc.madre_ocupacion} />
            <Row label="Centro de trabajo" value={enc.madre_centro_trabajo} />
            <Row label="Ingresos mensuales" value={enc.madre_ingresos_mensuales != null ? `$${Number(enc.madre_ingresos_mensuales).toLocaleString()}` : undefined} />
          </Bloque>
          {/* V */}
          <Bloque title="V. Familia">
            <Row label="Integrantes" value={enc.familia_total_integrantes} />
            <Row label="Hijos" value={enc.familia_num_hijos} />
            <Row label="Edades hijos" value={enc.familia_edades_hijos} />
            <Row label="Hijos estudiando" value={enc.familia_num_estudiantes} />
          </Bloque>
          {/* VI */}
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
          {/* VII */}
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

export default function EncuestasAdminPage() {
  const [filtroEnviada, setFiltroEnviada] = useState<'todas' | 'enviadas' | 'borradores'>('todas')
  const [selected, setSelected] = useState<(EncuestaSocioeconomica & { alumno?: any; periodo?: any }) | null>(null)

  const params: Record<string, string> = {}
  if (filtroEnviada === 'enviadas')   params.enviada = 'true'
  if (filtroEnviada === 'borradores') params.enviada = 'false'

  const { data, isLoading } = useQuery({
    queryKey: ['encuestas-admin', filtroEnviada],
    queryFn: () => permanenciaApi.getEncuestas(params),
  })

  const encuestas: any[] = data?.data ?? []

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
              {encuestas.map((enc: any) => (
                <tr key={enc.id} className="hover:bg-blue-50/60 transition-colors cursor-pointer">
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
                    <button onClick={() => setSelected(enc)}
                      className="text-blue-600 hover:underline text-xs font-medium">
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <DetailModal enc={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
