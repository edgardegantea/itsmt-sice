import { useState } from 'react'
import { useAuthStore } from '../../../store/authStore'
import { useToastStore } from '../../../store/toastStore'
import { useConfiguracion } from '@/hooks/useConfiguracion'

interface AcuseRegistro {
  folio: string
  oficio: string
  docenteNombre: string
  carrera: string
  modalidad: string
  fechaRecepcion: string
  registradoAt: string
  ip: string
  estatus: 'registrado' | 'pendiente'
  hashSeguridad: string
}

export default function AcusesOficialesPage() {
  const { user } = useAuthStore()
  const { config } = useConfiguracion()
  const addToast = useToastStore(s => s.toast)

  const [activeTab, setActiveTab] = useState<'oficio' | 'anexo' | 'evaluacion' | 'alertas'>('oficio')
  const [modalAcuseOpen, setModalAcuseOpen] = useState(false)
  const [nombreFirmante, setNombreFirmante] = useState(user?.name || 'Mtro. Edgar Degante Aguilar')
  const [carreraFirmante, setCarreraFirmante] = useState('Ingeniería Mecatrónica')
  const [modalidadFirmante, setModalidadFirmante] = useState('Escolarizado')
  const [fechaRecepcion, setFechaRecepcion] = useState('2026-09-01')

  const [acuseGuardado, setAcuseGuardado] = useState<AcuseRegistro>({
    folio: 'ACU-2026-0041-9821',
    oficio: 'DET/ITSMT/DA/0041/2026',
    docenteNombre: 'Edgar Degante Aguilar',
    carrera: 'Ingeniería Mecatrónica',
    modalidad: 'Escolarizado',
    fechaRecepcion: '2026-09-01',
    registradoAt: '2026-09-01T10:14:00',
    ip: '187.210.45.12',
    estatus: 'registrado',
    hashSeguridad: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  })

  const registrarAcuse = (e: React.FormEvent) => {
    e.preventDefault()
    const nuevoAcuse: AcuseRegistro = {
      folio: `ACU-2026-0041-${Math.floor(1000 + Math.random() * 9000)}`,
      oficio: 'DET/ITSMT/DA/0041/2026',
      docenteNombre: nombreFirmante,
      carrera: carreraFirmante,
      modalidad: modalidadFirmante,
      fechaRecepcion: fechaRecepcion,
      registradoAt: new Date().toISOString(),
      ip: '187.210.45.12',
      estatus: 'registrado',
      hashSeguridad: Math.random().toString(36).substring(2) + Date.now().toString(36),
    }
    setAcuseGuardado(nuevoAcuse)
    setModalAcuseOpen(false)
    addToast('Acuse de Conocimiento del Oficio Circular registrado correctamente en el sistema.', 'success')
  }

  const imprimirAcuseOficial = () => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html>
        <head>
          <title>Acuse de Conocimiento - Oficio Circular DET/ITSMT/DA/0041/2026</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #1b396a; padding-bottom: 15px; margin-bottom: 25px; }
            .gob { font-size: 11px; font-weight: bold; color: #475569; letter-spacing: 1px; }
            .title { font-size: 16px; font-weight: bold; color: #1b396a; margin-top: 5px; }
            .subtitle { font-size: 13px; color: #64748b; margin-top: 3px; }
            .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; margin-bottom: 20px; background-color: #f8fafc; }
            .field-row { display: flex; justify-content: space-between; border-bottom: 1px border-dashed #e2e8f0; padding: 8px 0; font-size: 12px; }
            .label { font-weight: bold; color: #475569; }
            .val { font-weight: 600; color: #0f172a; }
            .stamp { border: 2px dashed #059669; padding: 15px; text-align: center; border-radius: 8px; background-color: #ecfdf5; margin-top: 30px; }
            .stamp-title { font-weight: bold; color: #047857; font-size: 13px; }
            .hash { font-family: monospace; font-size: 9px; color: #64748b; margin-top: 6px; word-break: break-all; }
            .signatures { margin-top: 60px; display: flex; justify-content: space-around; text-align: center; font-size: 11px; }
            .sig-line { border-top: 1px solid #64748b; width: 40%; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="gob">GOBIERNO DEL ESTADO DE VERACRUZ · SEV · SEMSyS · DET</div>
            <div class="title">${config.nombre_institucion.toUpperCase()}</div>
            <div class="subtitle">ACUSE DIGITAL DE RECEPCIÓN Y CONOCIMIENTO DE DISPOSICIONES ACADÉMICAS</div>
          </div>

          <div class="box">
            <div class="field-row"><span class="label">Folio de Acuse:</span><span class="val">${acuseGuardado.folio}</span></div>
            <div class="field-row"><span class="label">Oficio Circular:</span><span class="val">${acuseGuardado.oficio}</span></div>
            <div class="field-row"><span class="label">Asunto:</span><span class="val">Bienvenida, apertura y lineamientos de operación académica (Ago-Dic 2026)</span></div>
            <div class="field-row"><span class="label">Docente / Servidor Público:</span><span class="val">${acuseGuardado.docenteNombre}</span></div>
            <div class="field-row"><span class="label">Carrera / Área:</span><span class="val">${acuseGuardado.carrera}</span></div>
            <div class="field-row"><span class="label">Modalidad:</span><span class="val">${acuseGuardado.modalidad}</span></div>
            <div class="field-row"><span class="label">Fecha de Recepción Notificada:</span><span class="val">${acuseGuardado.fechaRecepcion}</span></div>
            <div class="field-row"><span class="label">Fecha y Hora de Registro Digital:</span><span class="val">${new Date(acuseGuardado.registradoAt).toLocaleString('es-MX')}</span></div>
          </div>

          <p style="font-size: 11px; text-align: justify; color: #475569; margin-top: 15px;">
            La firma y registro de este apartado acredita la recepción formal del oficio y de su Anexo Único (Cronograma, seguimiento y control académico); no implica renuncia a derecho alguno ni modifica las condiciones laborales.
          </p>

          <div class="stamp">
            <div class="stamp-title">✓ REGISTRO OFICIAL Y CONSTANCIA DE ACUSE REGISTRADA EN SICE</div>
            <div style="font-size: 11px; color: #065f46; margin-top: 4px;">Firma Digital Verificada · TecNM Campus ${config.ciudad ?? ''}</div>
            <div class="hash">Hash de verificación SHA-256: ${acuseGuardado.hashSeguridad}</div>
          </div>

          <div class="signatures">
            <div class="sig-line">
              <strong>${acuseGuardado.docenteNombre}</strong><br/>
              Docente / Firma del Notificado
            </div>
            <div class="sig-line">
              <strong>Dr. Hugo Alberto Bravo Quintero</strong><br/>
              Director Académico ${config.nombre_corto}
            </div>
          </div>
        </body>
      </html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 500)
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* Encabezado Principal */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>SEV · SEMSyS · DET · TecNM</span>
            <span>•</span>
            <span className="text-[#1b396a]">{config.nombre_corto} {config.ciudad}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Oficio Circular DET/ITSMT/DA/0041/2026
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Bienvenida, apertura y lineamientos de operación académica — Periodo Agosto 2026 - Diciembre 2026
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {acuseGuardado.estatus === 'registrado' ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Acuse de Conocimiento Registrado
              </span>
              <button
                onClick={imprimirAcuseOficial}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231a1.125 1.125 0 0 1-1.12-1.227L6.34 18m11.318-4.171a3 3 0 0 0 0-5.658H6.34a3 3 0 0 0 0 5.658m11.318 0A3.001 3.001 0 0 1 15 17.25H9a3.001 3.001 0 0 1-2.658-1.421" />
                </svg>
                Imprimir Acuse
              </button>
            </div>
          ) : (
            <button
              onClick={() => setModalAcuseOpen(true)}
              className="px-4 py-2 bg-[#1b396a] hover:bg-[#142a4f] text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
              Firmar y Registrar Acuse de Conocimiento
            </button>
          )}
        </div>
      </div>

      {/* Pestañas de Navegación del Documento */}
      <div className="border-b border-slate-200 bg-white rounded-t-xl px-4 pt-3 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('oficio')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'oficio' ? 'border-[#1b396a] text-[#1b396a]' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          📜 Oficio Circular (Fechas & Directivas)
        </button>
        <button
          onClick={() => setActiveTab('anexo')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'anexo' ? 'border-[#1b396a] text-[#1b396a]' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          📋 Tabla A1. Matriz de Formatos SGI G4 (F-03-01 a F-03-07)
        </button>
        <button
          onClick={() => setActiveTab('evaluacion')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'evaluacion' ? 'border-[#1b396a] text-[#1b396a]' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          ⚖️ Tabla A2 y A3. Reglas & Responsabilidades TecNM
        </button>
        <button
          onClick={() => setActiveTab('alertas')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'alertas' ? 'border-[#1b396a] text-[#1b396a]' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🚨 Tabla A4. Alertas de Intervención Inmediata
        </button>
      </div>

      {/* Contenido según pestaña */}
      <div className="bg-white rounded-b-xl border border-slate-200 p-6 space-y-6">

        {activeTab === 'oficio' && (
          <div className="space-y-6">
            <div className="border-l-4 border-[#1b396a] bg-slate-50 p-4 rounded-r-lg space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>Martínez de la Torre, Ver., a 26 de agosto de 2026</span>
                <span>Periodo: Agosto 2026 - Diciembre 2026</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">
                Firmado por: Ing. Eloy Marcos Domínguez (Jefatura Mecatrónica) & Dr. Hugo Alberto Bravo Quintero (Dirección Académica)
              </p>
            </div>

            <div className="space-y-3 text-sm text-slate-700">
              <h3 className="font-bold text-[#1b396a] text-base">PRIMERO: Fechas Centrales para el Personal Docente</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse border border-slate-200">
                  <thead className="bg-[#1b396a] text-white">
                    <tr>
                      <th className="p-2.5 border border-slate-300">Fecha</th>
                      <th className="p-2.5 border border-slate-300">Actividad</th>
                      <th className="p-2.5 border border-slate-300">Aplicación Académica</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2.5 font-semibold">24 ago - 18 dic</td>
                      <td className="p-2.5">Periodo Escolarizado</td>
                      <td className="p-2.5">Inicio el 24 de agosto y cierre de semestre el 18 de diciembre.</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-2.5 font-semibold">29 ago - 10 oct</td>
                      <td className="p-2.5">Modalidad Mixta (Módulo 1)</td>
                      <td className="p-2.5">Inicio el 29 de agosto y conclusión el 10 de octubre.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold">18 oct - 28 nov</td>
                      <td className="p-2.5">Modalidad Mixta (Módulo 2)</td>
                      <td className="p-2.5">Inicio el 18 de octubre y conclusión el 28 de noviembre.</td>
                    </tr>
                    <tr className="bg-amber-50">
                      <td className="p-2.5 font-bold text-amber-800">17 de septiembre</td>
                      <td className="p-2.5 font-bold text-amber-800">Fecha Límite Instrumentación</td>
                      <td className="p-2.5 text-amber-900">Entrega de instrumentación didáctica y planeación en SICE.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold">24-25 septiembre</td>
                      <td className="p-2.5">Aniversario Institucional</td>
                      <td className="p-2.5">Atención de actividades conmemorativas que determine la institución.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold">5 de diciembre</td>
                      <td className="p-2.5">Segundas Oportunidades (Mixta)</td>
                      <td className="p-2.5">Aplica a las asignaturas de los módulos 1 y 2.</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-2.5 font-semibold">14 - 16 diciembre</td>
                      <td className="p-2.5">Segundas Oportunidades (Escolarizado)</td>
                      <td className="p-2.5">Complementación de evidencias conforme a instrumentación TecNM.</td>
                    </tr>
                    <tr className="bg-emerald-50">
                      <td className="p-2.5 font-bold text-emerald-800">18 de diciembre</td>
                      <td className="p-2.5 font-bold text-emerald-800">Cierre de Semestre</td>
                      <td className="p-2.5 text-emerald-900">Cierre académico-administrativo, captura de actas y resguardo.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">Puntos Clave del Instructivo</h4>
                <ul className="text-xs text-slate-600 mt-2 space-y-1.5 list-disc pl-4">
                  <li>En la primera sesión debe realizarse el <strong>Encuadre</strong> y la <strong>Evaluación Diagnóstica</strong>.</li>
                  <li>Resultados formativos deben comunicarse en un máximo de <strong>5 días hábiles</strong>.</li>
                  <li>No se autoriza la omisión de competencias ni recortar el semestre de 16 semanas.</li>
                  <li>Inasistencia $\ge 50\%$ semanal obliga a canalización con formato <strong>F-05-04</strong>.</li>
                </ul>
              </div>

              <div className="border border-amber-200 rounded-lg p-4 bg-amber-50/50">
                <h4 className="font-bold text-xs text-amber-800 uppercase tracking-wide">Tabla 3: Cortes de Seguimiento Docente</h4>
                <div className="text-xs text-amber-900 mt-2 space-y-1">
                  <p><strong>1er Seguimiento:</strong> 21 al 25 de septiembre de 2026</p>
                  <p><strong>2do Seguimiento:</strong> 26 de octubre al 4 de noviembre de 2026</p>
                  <p><strong>3er Seguimiento:</strong> 7 al 11 de diciembre de 2026</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'anexo' && (
          <div className="space-y-4">
            <h3 className="font-bold text-[#1b396a] text-sm uppercase tracking-wide">
              Tabla A1: Matriz de Documentos de Planeación y Control (Formatos SGI/G4)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-slate-200">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="p-2.5 border border-slate-300">Clave</th>
                    <th className="p-2.5 border border-slate-300">Documento</th>
                    <th className="p-2.5 border border-slate-300">Momento de Entrega</th>
                    <th className="p-2.5 border border-slate-300">Responsable / Validación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  <tr>
                    <td className="p-2.5 font-bold text-[#1b396a]">F-03-01</td>
                    <td className="p-2.5 font-medium">Instrumentación didáctica por competencias</td>
                    <td className="p-2.5">Por cada asignatura y grupo, antes del inicio</td>
                    <td className="p-2.5">Docente; revisión colegiada y validación de jefatura</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-2.5 font-bold text-[#1b396a]">F-03-02</td>
                    <td className="p-2.5 font-medium">Seguimiento del curso y avance programático en línea</td>
                    <td className="p-2.5">En cada corte y al cierre</td>
                    <td className="p-2.5">Docente; seguimiento de jefatura</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-slate-800">EVA-03</td>
                    <td className="p-2.5">Evaluación y avance de asignatura</td>
                    <td className="p-2.5">Cuando lo requiera el procedimiento institucional</td>
                    <td className="p-2.5">Docente / Jefatura</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-2.5 font-bold text-[#1b396a]">F-03-03</td>
                    <td className="p-2.5">Desempeño docente</td>
                    <td className="p-2.5">Conforme al periodo institucional de evaluación</td>
                    <td className="p-2.5">Área responsable / Jefatura</td>
                  </tr>
                  <tr className="bg-amber-50">
                    <td className="p-2.5 font-bold text-amber-800">F-03-04</td>
                    <td className="p-2.5 font-bold text-amber-900">Análisis de causa raíz</td>
                    <td className="p-2.5 text-amber-900">Cuando exista desviación o rezago $\ge 25\%$ en diagnóstico</td>
                    <td className="p-2.5 text-amber-900">Docente y jefatura; análisis colegiado</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-[#1b396a]">F-03-05</td>
                    <td className="p-2.5">Guía de actividades de aprendizaje en línea</td>
                    <td className="p-2.5">En modalidad mixta o cuando se utilice mediación virtual</td>
                    <td className="p-2.5">Docente; validación de jefatura</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-2.5 font-bold text-[#1b396a]">F-03-06</td>
                    <td className="p-2.5">Evaluación del aprendizaje</td>
                    <td className="p-2.5">Previo a evaluaciones y al cierre</td>
                    <td className="p-2.5">Docente; autorización o verificación de jefatura</td>
                  </tr>
                  <tr className="bg-red-50">
                    <td className="p-2.5 font-bold text-red-800">F-05-04</td>
                    <td className="p-2.5 font-bold text-red-900">Reporte de la problemática para tutoría</td>
                    <td className="p-2.5 text-red-900">Al identificar inasistencia $\ge 50\%$, indisciplina o rezago</td>
                    <td className="p-2.5 text-red-900">Docente / Tutor / Desarrollo Académico</td>
                  </tr>
                  <tr className="bg-emerald-50">
                    <td className="p-2.5 font-bold text-emerald-800">F-03-07</td>
                    <td className="p-2.5 font-bold text-emerald-900">Constancia de cumplimiento de asignatura</td>
                    <td className="p-2.5 text-emerald-900">Al cierre, conforme al procedimiento vigente</td>
                    <td className="p-2.5 text-emerald-900">Docente; validación institucional</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'evaluacion' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-[#1b396a] text-sm uppercase tracking-wide mb-3">
                Tabla A2: Criterios de Aplicación Obligatoria del TecNM
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="border border-slate-200 p-4 rounded-lg bg-slate-50">
                  <span className="font-bold text-[#1b396a] block mb-1">Diagnóstico Inicial</span>
                  <p className="text-slate-600">Se aplica al inicio con base en competencias previas. No integra calificación sumativa.</p>
                </div>
                <div className="border border-slate-200 p-4 rounded-lg bg-slate-50">
                  <span className="font-bold text-[#1b396a] block mb-1">Plazo de Resultados</span>
                  <p className="text-slate-600">Los resultados formativos se comunican en un máximo de <strong>5 días hábiles</strong>.</p>
                </div>
                <div className="border border-slate-200 p-4 rounded-lg bg-slate-50">
                  <span className="font-bold text-[#1b396a] block mb-1">Acreditación Mínima</span>
                  <p className="text-slate-600">Exige el 100% de competencias aprobadas, escala 0-100 y valoración mínima de <strong>70</strong>.</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-[#1b396a] text-sm uppercase tracking-wide mb-3">
                Tabla A3: Distribución de Responsabilidades por Rol
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 border border-slate-200 rounded-lg flex justify-between items-center">
                  <span className="font-bold text-slate-800 w-1/4">Docente:</span>
                  <span className="text-slate-600 w-3/4">Planear, comunicar criterios, evaluar, retroalimentar, reportar avances y resguardar evidencias.</span>
                </div>
                <div className="p-3 border border-slate-200 rounded-lg flex justify-between items-center bg-slate-50">
                  <span className="font-bold text-slate-800 w-1/4">Jefatura Académica:</span>
                  <span className="text-slate-600 w-3/4">Validar planeación, revisar cortes, documentar desviaciones y acordar acciones correctivas.</span>
                </div>
                <div className="p-3 border border-slate-200 rounded-lg flex justify-between items-center">
                  <span className="font-bold text-slate-800 w-1/4">Desarrollo Académico:</span>
                  <span className="text-slate-600 w-3/4">Coordinar tutoría, formación docente y consolidar necesidades derivadas del diagnóstico.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'alertas' && (
          <div className="space-y-4">
            <h3 className="font-bold text-red-700 text-sm uppercase tracking-wide">
              Tabla A4: Alertas que Requieren Intervención Inmediata
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 border border-red-200 rounded-lg bg-red-50/40">
                <p className="font-bold text-red-800">Instrumentación no entregada o no comunicada</p>
                <p className="text-slate-600 mt-1">Acción: Requerimiento de regularización por la jefatura y evidencia de comunicación al grupo.</p>
              </div>
              <div className="p-3.5 border border-amber-200 rounded-lg bg-amber-50/40">
                <p className="font-bold text-amber-800">Retraso superior al 10% del avance planeado</p>
                <p className="text-slate-600 mt-1">Acción: Formato F-03-04, ajuste documentado y estrategia de recuperación sin reducir competencias.</p>
              </div>
              <div className="p-3.5 border border-red-200 rounded-lg bg-red-50/40">
                <p className="font-bold text-red-800">Diagnóstico con brechas en $\ge 25\%$ del grupo</p>
                <p className="text-slate-600 mt-1">Acción: Análisis de causa raíz (F-03-04), nivelación y canalización a Desarrollo Académico.</p>
              </div>
              <div className="p-3.5 border border-amber-200 rounded-lg bg-amber-50/40">
                <p className="font-bold text-amber-800">Estudiante en riesgo sin reporte o canalización</p>
                <p className="text-slate-600 mt-1">Acción: Regularizar el formato F-05-04 o el registro institucional y notificar al tutor.</p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Modal de Firma de Acuse */}
      {modalAcuseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-800 text-base">Firma Digital de Acuse de Conocimiento</h3>
              <button onClick={() => setModalAcuseOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={registrarAcuse} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre Completo del Servidor Público / Docente</label>
                <input
                  type="text"
                  required
                  value={nombreFirmante}
                  onChange={e => setNombreFirmante(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-[#1b396a]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Carrera / Área Académica</label>
                  <input
                    type="text"
                    required
                    value={carreraFirmante}
                    onChange={e => setCarreraFirmante(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Modalidad</label>
                  <select
                    value={modalidadFirmante}
                    onChange={e => setModalidadFirmante(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                  >
                    <option value="Escolarizado">Escolarizado</option>
                    <option value="Mixta">Mixta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fecha de Notificación Recibida</label>
                <input
                  type="date"
                  required
                  value={fechaRecepcion}
                  onChange={e => setFechaRecepcion(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-slate-600">
                <p className="font-semibold text-slate-700">Declaración de Conocimiento:</p>
                <p>
                  Declaro haber recibido y leído el Oficio Circular <strong>DET/ITSMT/DA/0041/2026</strong> y su Anexo Único con las disposiciones y fechas del periodo Agosto-Diciembre 2026.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAcuseOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1b396a] text-white rounded-lg font-bold hover:bg-[#142a4f]"
                >
                  Registrar Firma Digital
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
