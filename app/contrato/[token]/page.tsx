'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { CheckCircle, PenLine, RotateCcw, Download } from 'lucide-react'
import SignaturePad from 'signature_pad'

const TERMINOS = [
  "La embarcación podrá alquilarse con patrón profesional designado por Black Boats Ibiza o sin patrón, únicamente a personas que dispongan de la titulación náutica legalmente exigida y en vigor.",
  "En los alquileres sin patrón, el arrendatario deberá presentar previamente la titulación náutica válida y en vigor requerida para el gobierno de la embarcación, así como documento identificativo oficial.",
  "El arrendatario declara disponer de los conocimientos y experiencia necesarios para el manejo seguro de la embarcación y asume la responsabilidad total sobre la misma durante el periodo de alquiler.",
  "En modalidad sin patrón, el arrendatario será plenamente responsable en todos los aspectos relacionados con: Navegación, maniobras, fondeo, seguridad de los ocupantes, cumplimiento de normativa marítima, sanciones, daños propios, daños a terceros, y cualquier incidencia derivada del uso de la embarcación.",
  "Black Boats Ibiza podrá denegar la entrega de la embarcación si considera insuficiente la documentación aportada o aprecia falta de capacidad para realizar una navegación segura.",
  "En modalidad con patrón, todas las decisiones relativas a navegación, seguridad, itinerario y condiciones meteorológicas corresponderán exclusivamente al patrón profesional.",
  "Está terminantemente prohibido navegar cerca de rocas, zonas de poca profundidad o áreas consideradas peligrosas.",
  "Las embarcaciones de mayor tamaño, veleros y embarcaciones profesionales tendrán siempre prioridad de paso.",
  "El límite autorizado de navegación será Cala Salada por el norte y Cala Comte por el sur. Superar estos límites supondrá una penalización económica de 50€ y posibles responsabilidades derivadas de incidencias de seguridad o pérdida de cobertura.",
  "Está totalmente prohibida la navegación nocturna. La puesta de sol deberá disfrutarse desde zonas próximas al puerto como Café Mambo o Café del Mar para garantizar el regreso con luz suficiente y dentro del horario contratado.",
  "El ancla deberá soltarse siempre de forma controlada y nunca lanzarse bruscamente.",
  "Está prohibido fondear en zonas de gran profundidad donde la recuperación del ancla pueda resultar peligrosa o imposible.",
  "Antes del baño, los ocupantes deberán comprobar la posible presencia de medusas y, en caso necesario, desplazarse a otra zona.",
  "El ancla deberá lanzarse antes de apagar el motor y recogerse siempre con el motor encendido.",
  "Se deberá mantener una distancia mínima aproximada de 15 metros respecto a otras embarcaciones durante las maniobras de fondeo.",
  "Está prohibido fondear sobre posidonia o en zonas protegidas.",
  "Está expresamente prohibido fondear en Cala Salada por tratarse de una zona protegida y reserva marina.",
  "En la isla de Sa Conillera está prohibido desembarcar o acceder a tierra firme por tratarse de una zona protegida de reproducción de aves.",
  "En Sa Conillera sí está permitido fondear en las inmediaciones y realizar actividades de baño o snorkel respetando el entorno natural.",
  "La embarcación deberá devolverse a la hora y lugar acordados.",
  "El arrendatario será responsable de cualquier daño, golpe, pérdida, rotura, quemadura o desperfecto ocasionado durante el periodo de alquiler.",
  "El coste de reparación o sustitución de cualquier elemento dañado será asumido íntegramente por el arrendatario.",
  "La limpieza básica está incluida. Si la embarcación se devuelve en condiciones de suciedad excesiva, se aplicará un suplemento de limpieza de 30€.",
  "Cada 15 minutos de retraso en la devolución supondrá un cargo adicional de 60€.",
  "Para evitar retrasos, se recomienda no realizar maniobras de fondeo durante la última hora de navegación salvo proximidad al puerto.",
  "La fianza podrá abonarse en efectivo o mediante tarjeta bancaria y su importe dependerá del tipo de embarcación y modalidad de alquiler.",
  "La devolución de la fianza quedará sujeta a la revisión del estado de la embarcación, cumplimiento de las normas y devolución puntual.",
  "Black Boats Ibiza podrá retener total o parcialmente la fianza en caso de daños, negligencia, incumplimiento contractual o sanciones derivadas del uso de la embarcación.",
  "Todas las embarcaciones disponen de localizador GPS y sistema de seguridad con bloqueo remoto de motor.",
  "Los menores de 5 años deberán llevar chaleco salvavidas en todo momento.",
  "El arrendatario y acompañantes deberán respetar en todo momento las instrucciones del patrón o del equipo Black Boats Ibiza.",
  "Está prohibido el consumo de sustancias ilegales a bordo.",
  "Solo se permiten bebidas de baja graduación como cerveza, sangría o similares.",
  "Black Boats Ibiza y/o el patrón podrán cancelar o finalizar la navegación sin derecho a devolución si consideran que existe riesgo para la seguridad debido al estado de algún ocupante.",
  "El combustible no estará incluido salvo pacto expreso por escrito y deberá abonarse según el consumo realizado.",
  "Black Boats Ibiza y/o el patrón profesional podrán modificar itinerarios, cancelar salidas o regresar a puerto cuando las condiciones meteorológicas o de seguridad así lo aconsejen.",
  "Las rutas hacia Formentera estarán siempre sujetas al estado del mar, condiciones meteorológicas, autonomía de la embarcación, ocupación y criterio profesional del patrón o del equipo responsable.",
  "Está prohibido navegar con un número de personas superior al autorizado para la embarcación.",
  "Está prohibido permitir gobernar la embarcación a personas no autorizadas o sin titulación válida.",
  "Está prohibido realizar cambios de pasajeros durante la jornada sin autorización expresa de Black Boats Ibiza.",
  "Está prohibido recoger o desembarcar personas en muelles no autorizados.",
  "Está prohibido entrar o salir del puerto sin autorización o sin acompañamiento del equipo Black Boats Ibiza cuando así se indique.",
  "Está prohibido manipular sistemas GPS, motor o elementos de seguridad de la embarcación.",
  "Está prohibido conducir la embarcación bajo efectos del alcohol, drogas o sustancias que afecten a la navegación segura.",
  "El arrendatario será el único responsable de cualquier multa, sanción administrativa o responsabilidad derivada del incumplimiento de normativa marítima durante el periodo de alquiler.",
  "La embarcación dispone del seguro obligatorio correspondiente, incluyendo cobertura de responsabilidad civil conforme a la normativa vigente.",
  "El seguro no cubrirá daños ocasionados por negligencia, uso indebido de la embarcación, conducción bajo efectos del alcohol o drogas, incumplimiento de las normas de navegación, utilización fuera de las zonas autorizadas ni cualquier actuación imprudente realizada por el arrendatario o sus acompañantes.",
  "El arrendatario será responsable económico directo de todos los daños, perjuicios, sanciones o costes derivados de actuaciones negligentes o incumplimientos de las normas establecidas.",
  "El arrendatario autoriza expresamente a Black Boats Ibiza a realizar cargos posteriores en la tarjeta facilitada durante la reserva o formalización del contrato, exclusivamente en caso de existir importes pendientes debidamente justificados derivados de daños en la embarcación, pérdidas de material, combustible, limpieza extraordinaria, retrasos, sanciones, incumplimientos contractuales o cualquier otro coste ocasionado durante el periodo de alquiler.",
  "Black Boats Ibiza se compromete a no realizar cargos adicionales injustificados y cualquier cobro posterior deberá estar debidamente acreditado y relacionado con el servicio contratado o incidencias ocasionadas durante el alquiler.",
  "Los datos personales facilitados serán tratados por Black Boats Ibiza para la gestión de reservas, contratos, seguros, pagos y demás obligaciones derivadas de la actividad.",
  "La firma de la parte delantera del contrato implica la aceptación íntegra de todas las presentes normas y condiciones generales de navegación, uso de la embarcación y política de protección de datos de Black Boats Ibiza.",
  "Mediante dicha firma, el cliente autoriza expresamente a Black Boats Ibiza al uso de fotografías y/o vídeos realizados durante la actividad para fines promocionales, publicitarios y de difusión comercial en redes sociales, página web y demás medios corporativos de la empresa.",
  "Para cualquier controversia derivada del contrato o uso de la embarcación, las partes se someten expresamente a los juzgados y tribunales de Ibiza.",
]

export default function ContratoPage() {
  const { token } = useParams<{ token: string }>()
  const supabase = createClient()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sigPadRef = useRef<SignaturePad | null>(null)
  const pdfRef = useRef<HTMLDivElement>(null)

  const [contract, setContract] = useState<any>(null)
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [signed, setSigned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [signerName, setSignerName] = useState('')
  const [error, setError] = useState('')
  const [generatingPdf, setGeneratingPdf] = useState(false)

  async function downloadPdf() {
    setGeneratingPdf(true)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const ContratoPDF = (await import('@/components/ContratoPDF')).default
      const blob = await pdf(<ContratoPDF contract={contract} booking={booking} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const name = booking?.client
        ? `contrato-${booking.client.first_name}-${booking.client.last_name}`.toLowerCase().replace(/\s+/g, '-')
        : 'contrato'
      a.href = url
      a.download = `${name}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert('Error al generar el PDF. Inténtalo de nuevo.')
    }
    setGeneratingPdf(false)
  }

  useEffect(() => {
    async function load() {
      if (!token) return

      // Step 1: fetch contract alone
      const { data: cList, error: cErr } = await supabase
        .from('contracts')
        .select('*')
        .eq('token', token)
        .limit(1)

      if (cErr) { setError('Error: ' + cErr.message); setLoading(false); return }
      const c = cList?.[0] ?? null
      if (!c) { setError('Contrato no encontrado'); setLoading(false); return }
      setContract(c)
      if (c.status === 'signed') setSigned(true)

      // Step 2: fetch booking with client and boat
      const { data: bList } = await supabase
        .from('bookings')
        .select('*, client:clients(first_name,last_name,phone,id_number,email,nationality,boat_license), boat:boats(name)')
        .eq('id', c.booking_id)
        .limit(1)

      const b = bList?.[0] ?? null
      setBooking(b)
      const client = b?.client
      if (client) setSignerName(`${client.first_name} ${client.last_name}`)
      setLoading(false)
    }
    load()
  }, [token])

  useEffect(() => {
    if (!canvasRef.current || signed || loading) return
    const pad = new SignaturePad(canvasRef.current, {
      backgroundColor: 'rgb(255,255,255)',
      penColor: 'rgb(0,0,0)',
    })
    sigPadRef.current = pad
    const resize = () => {
      const canvas = canvasRef.current!
      const ratio = window.devicePixelRatio || 1
      canvas.width = canvas.offsetWidth * ratio
      canvas.height = canvas.offsetHeight * ratio
      canvas.getContext('2d')!.scale(ratio, ratio)
      pad.clear()
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [loading, signed])

  async function handleSign() {
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      setError('Por favor firma en el recuadro antes de continuar'); return
    }
    if (!signerName.trim()) {
      setError('Por favor introduce tu nombre completo'); return
    }
    setSaving(true); setError('')
    const signatureData = sigPadRef.current.toDataURL('image/png')
    const { error: e } = await supabase.from('contracts').update({
      status: 'signed',
      signature_data: signatureData,
      signed_at: new Date().toISOString(),
      signed_name: signerName.trim(),
    }).eq('token', token)
    if (e) { setError('Error al guardar la firma. Inténtalo de nuevo.'); setSaving(false); return }
    setSigned(true); setSaving(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-500 font-medium">{error}</p>
        <p className="text-gray-500 text-sm mt-2">El enlace puede haber expirado o ser incorrecto.</p>
      </div>
    </div>
  )

  if (signed) {
    const client = booking?.client
    const boat = booking?.boat
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Download button */}
          <div className="flex justify-end">
            <button
              onClick={downloadPdf}
              disabled={generatingPdf}
              className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] hover:bg-[#E8C97A] text-black text-sm font-semibold rounded-lg disabled:opacity-60"
            >
              <Download size={15} /> {generatingPdf ? 'Generando...' : 'Descargar PDF'}
            </button>
          </div>

          <div ref={pdfRef}>
          {/* Header firmado */}
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center border border-gray-100">
            <img src="/3.png" alt="Black Boats Ibiza" className="h-16 w-auto object-contain mx-auto mb-3" />
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle size={20} className="text-green-600" />
              <h1 className="text-gray-900 font-bold text-xl">Contrato firmado</h1>
            </div>
            <p className="text-gray-500 text-sm">
              {contract?.signed_name} · {contract?.signed_at && new Date(contract.signed_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Datos cliente y reserva */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 space-y-4">
            <h2 className="text-gray-900 font-semibold text-sm uppercase tracking-wide border-b border-gray-100 pb-3">Datos del Contrato</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-400 text-xs mb-0.5">Cliente</p><p className="text-gray-900 font-medium">{client?.first_name} {client?.last_name}</p></div>
              {client?.id_number && <div><p className="text-gray-400 text-xs mb-0.5">DNI / Pasaporte</p><p className="text-gray-900 font-medium">{client.id_number}</p></div>}
              {client?.boat_license && <div><p className="text-gray-400 text-xs mb-0.5">Licencia náutica</p><p className="text-gray-900 font-medium">{client.boat_license}</p></div>}
              {client?.phone && <div><p className="text-gray-400 text-xs mb-0.5">Teléfono</p><p className="text-gray-900 font-medium">{client.phone}</p></div>}
              {client?.email && <div><p className="text-gray-400 text-xs mb-0.5">Email</p><p className="text-gray-900 font-medium">{client.email}</p></div>}
              {client?.nationality && <div><p className="text-gray-400 text-xs mb-0.5">Nacionalidad</p><p className="text-gray-900 font-medium">{client.nationality}</p></div>}
              <div><p className="text-gray-400 text-xs mb-0.5">Embarcación</p><p className="text-gray-900 font-medium">{boat?.name}</p></div>
              <div><p className="text-gray-400 text-xs mb-0.5">Modalidad</p><p className="text-gray-900 font-medium">{booking?.rental_type === 'bareboat' ? 'Sin patrón' : 'Con patrón'}</p></div>
              <div><p className="text-gray-400 text-xs mb-0.5">Fecha de salida</p><p className="text-gray-900 font-medium">{booking?.start_date ? new Date(booking.start_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}</p></div>
              {booking?.start_time && <div><p className="text-gray-400 text-xs mb-0.5">Hora de salida</p><p className="text-gray-900 font-medium">{booking.start_time?.slice(0,5)}</p></div>}
              {booking?.end_date && booking.end_date !== booking.start_date && <div><p className="text-gray-400 text-xs mb-0.5">Fecha de regreso</p><p className="text-gray-900 font-medium">{new Date(booking.end_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p></div>}
              {booking?.end_time && <div><p className="text-gray-400 text-xs mb-0.5">Hora de regreso</p><p className="text-gray-900 font-medium">{booking.end_time?.slice(0,5)}</p></div>}
              {booking?.adults && <div><p className="text-gray-400 text-xs mb-0.5">Pasajeros</p><p className="text-gray-900 font-medium">{booking.adults} adultos{booking.children > 0 ? ` · ${booking.children} niños` : ''}</p></div>}
              {booking?.captain_id && <div><p className="text-gray-400 text-xs mb-0.5">Capitán</p><p className="text-gray-900 font-medium">{booking.captain_id}</p></div>}
              {booking?.total_price && <div><p className="text-gray-400 text-xs mb-0.5">Importe total</p><p className="text-gray-900 font-bold text-[#C9A84C]">{Number(booking.total_price).toLocaleString('es-ES')} €</p></div>}
            </div>
          </div>

          {/* T&C */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-gray-900 font-semibold text-sm uppercase tracking-wide">Términos y Condiciones Aceptados</h2>
            </div>
            <div className="px-6 py-4 max-h-64 overflow-y-auto space-y-2">
              {TERMINOS.map((item, i) => (
                <div key={i} className="flex gap-3 text-sm text-gray-600 leading-relaxed">
                  <span className="text-[#C9A84C] font-bold shrink-0 w-6 text-right">{i + 1}.</span>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Firma */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 space-y-3">
            <h2 className="text-gray-900 font-semibold text-sm uppercase tracking-wide border-b border-gray-100 pb-3">Firma del Arrendatario</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-400 text-xs mb-0.5">Firmado por</p><p className="text-gray-900 font-medium">{contract?.signed_name}</p></div>
              <div><p className="text-gray-400 text-xs mb-0.5">Fecha y hora</p><p className="text-gray-900 font-medium">{contract?.signed_at && new Date(contract.signed_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div>
            </div>
            {contract?.signature_data && (
              <div>
                <p className="text-gray-400 text-xs mb-2">Firma digitalizada</p>
                <div className="border border-gray-200 rounded-lg p-2 bg-gray-50 inline-block">
                  <img src={contract.signature_data} alt="Firma" className="max-h-24 w-auto" />
                </div>
              </div>
            )}
          </div>
          </div>{/* end pdfRef */}
        </div>
      </div>
    )
  }

  const client = booking?.client
  const boat = booking?.boat

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>
      <div className="max-w-2xl mx-auto space-y-6">
        <div ref={pdfRef}>
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 text-center border border-gray-100">
          <img src="/3.png" alt="Black Boats Ibiza" className="h-20 w-auto object-contain mx-auto mb-3" />
          <h1 className="text-gray-900 font-bold text-xl">Contrato de Alquiler Náutico</h1>
          <p className="text-gray-500 text-sm mt-1">Black Boats Ibiza · Ibiza, España</p>
        </div>

        {/* Booking info */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 space-y-4">
          <h2 className="text-gray-900 font-semibold text-sm uppercase tracking-wide border-b border-gray-100 pb-3">Datos de la Reserva</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><p className="text-gray-400 text-xs mb-0.5">Cliente</p><p className="text-gray-900 font-medium">{client?.first_name} {client?.last_name}</p></div>
            {client?.id_number && <div><p className="text-gray-400 text-xs mb-0.5">DNI / Pasaporte</p><p className="text-gray-900 font-medium">{client.id_number}</p></div>}
            {client?.boat_license && <div><p className="text-gray-400 text-xs mb-0.5">Licencia náutica</p><p className="text-gray-900 font-medium">{client.boat_license}</p></div>}
            {client?.phone && <div><p className="text-gray-400 text-xs mb-0.5">Teléfono</p><p className="text-gray-900 font-medium">{client.phone}</p></div>}
            {client?.email && <div><p className="text-gray-400 text-xs mb-0.5">Email</p><p className="text-gray-900 font-medium">{client.email}</p></div>}
            {client?.nationality && <div><p className="text-gray-400 text-xs mb-0.5">Nacionalidad</p><p className="text-gray-900 font-medium">{client.nationality}</p></div>}
            <div><p className="text-gray-400 text-xs mb-0.5">Embarcación</p><p className="text-gray-900 font-medium">{boat?.name}</p></div>
            <div><p className="text-gray-400 text-xs mb-0.5">Modalidad</p><p className="text-gray-900 font-medium">{booking?.rental_type === 'bareboat' ? 'Sin patrón' : 'Con patrón'}</p></div>
            <div><p className="text-gray-400 text-xs mb-0.5">Fecha de salida</p><p className="text-gray-900 font-medium">{booking?.start_date ? new Date(booking.start_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}</p></div>
            {booking?.start_time && <div><p className="text-gray-400 text-xs mb-0.5">Hora de salida</p><p className="text-gray-900 font-medium">{booking.start_time?.slice(0,5)}</p></div>}
            {booking?.end_date && booking.end_date !== booking.start_date && <div><p className="text-gray-400 text-xs mb-0.5">Fecha de regreso</p><p className="text-gray-900 font-medium">{new Date(booking.end_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p></div>}
            {booking?.end_time && <div><p className="text-gray-400 text-xs mb-0.5">Hora de regreso</p><p className="text-gray-900 font-medium">{booking.end_time?.slice(0,5)}</p></div>}
            {booking?.adults && <div><p className="text-gray-400 text-xs mb-0.5">Pasajeros</p><p className="text-gray-900 font-medium">{booking.adults} adultos{booking.children > 0 ? ` · ${booking.children} niños` : ''}</p></div>}
            {booking?.captain_id && <div><p className="text-gray-400 text-xs mb-0.5">Capitán asignado</p><p className="text-gray-900 font-medium">{booking.captain_id}</p></div>}
            {booking?.total_price && <div><p className="text-gray-400 text-xs mb-0.5">Importe total</p><p className="text-gray-900 font-bold text-[#C9A84C]">{Number(booking.total_price).toLocaleString('es-ES')} €</p></div>}
          </div>
        </div>

        {/* Terms */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-gray-900 font-semibold text-sm uppercase tracking-wide">Términos y Condiciones de Alquiler Náutico</h2>
          </div>
          <div className="px-6 py-4 max-h-80 overflow-y-auto space-y-2">
            {TERMINOS.map((item, i) => (
              <div key={i} className="flex gap-3 text-sm text-gray-600 leading-relaxed">
                <span className="text-[#C9A84C] font-bold shrink-0 w-6 text-right">{i + 1}.</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Signature */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 space-y-4">
          <h2 className="text-gray-900 font-semibold text-sm uppercase tracking-wide border-b border-gray-100 pb-3">Firma del Arrendatario</h2>
          <p className="text-gray-500 text-xs">Al firmar este documento, declaro haber leído y aceptado íntegramente los términos y condiciones de alquiler náutico de Black Boats Ibiza.</p>

          <div>
            <label className="text-gray-700 text-xs font-medium block mb-1">Nombre completo *</label>
            <input type="text" value={signerName} onChange={e => setSignerName(e.target.value)}
              placeholder="Escribe tu nombre completo"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/60" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-gray-700 text-xs font-medium">Firma *</label>
              <button onClick={() => sigPadRef.current?.clear()}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                <RotateCcw size={11} /> Borrar
              </button>
            </div>
            <div className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50 relative">
              <canvas ref={canvasRef} className="w-full touch-none" style={{ height: 150 }} />
              {!sigPadRef.current?.isEmpty() ? null : (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="flex items-center gap-2 text-gray-300">
                    <PenLine size={18} />
                    <span className="text-sm">Firma aquí</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <button onClick={handleSign} disabled={saving}
            className="w-full py-3 bg-[#C9A84C] text-black font-bold rounded-xl hover:bg-[#E8C97A] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {saving
              ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Firmando...</>
              : <><CheckCircle size={18} /> Firmar y aceptar el contrato</>}
          </button>
        </div>
        </div>{/* end pdfRef */}

        <div className="flex justify-center pb-2">
          <button
            onClick={downloadPdf}
            disabled={generatingPdf}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm rounded-lg disabled:opacity-60"
          >
            <Download size={14} /> {generatingPdf ? 'Generando...' : 'Descargar PDF'}
          </button>
        </div>
        <p className="text-center text-gray-400 text-xs pb-4">Black Boats Ibiza © 2025 · Ibiza, España</p>
      </div>
    </div>
  )
}
