'use client'

import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { backgroundColor: '#fff', padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#111' },
  logo: { width: 120, marginBottom: 12, alignSelf: 'center' },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 10, textAlign: 'center', color: '#6b7280', marginBottom: 20 },
  section: { marginBottom: 16, borderRadius: 6, border: '1 solid #e5e7eb', padding: 14 },
  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1, color: '#374151', borderBottom: '1 solid #e5e7eb', paddingBottom: 6, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '50%', marginBottom: 8 },
  cellLabel: { fontSize: 8, color: '#9ca3af', marginBottom: 2 },
  cellValue: { fontSize: 10, color: '#111827' },
  cellValueBold: { fontSize: 10, color: '#C9A84C', fontFamily: 'Helvetica-Bold' },
  termRow: { flexDirection: 'row', marginBottom: 5 },
  termNum: { width: 20, fontSize: 9, color: '#C9A84C', fontFamily: 'Helvetica-Bold' },
  termText: { flex: 1, fontSize: 9, color: '#4b5563', lineHeight: 1.4 },
  signatureBox: { border: '1 solid #e5e7eb', borderRadius: 4, padding: 8, marginTop: 8 },
  signatureImg: { maxHeight: 80, objectFit: 'contain' },
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#9ca3af' },
})

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
  "Está prohibido arrojar residuos al mar.",
  "No se permite fumar a bordo.",
  "Está prohibido cocinar a bordo salvo autorización expresa.",
  "No se admiten mascotas a bordo salvo autorización previa y expresa.",
  "Está prohibido el uso de equipos de música que puedan molestar a otras embarcaciones o bañistas.",
  "El arrendatario se compromete a respetar el medioambiente marino y la fauna local.",
  "El arrendatario deberá informar inmediatamente a Black Boats Ibiza de cualquier avería, incidencia o accidente.",
  "Está prohibido subarrendar la embarcación o cederla a terceros.",
  "El presente contrato se rige por la legislación española y la normativa de la Dirección General de la Marina Mercante.",
  "Los datos personales facilitados serán tratados por Black Boats Ibiza para la gestión de reservas, contratos, seguros, pagos y demás obligaciones derivadas de la actividad.",
  "La firma de la parte delantera del contrato implica la aceptación íntegra de todas las presentes normas y condiciones generales de navegación, uso de la embarcación y política de protección de datos de Black Boats Ibiza.",
  "Mediante dicha firma, el cliente autoriza expresamente a Black Boats Ibiza al uso de fotografías y/o vídeos realizados durante la actividad para fines promocionales, publicitarios y de difusión comercial en redes sociales, página web y demás medios corporativos de la empresa.",
  "Para cualquier controversia derivada del contrato o uso de la embarcación, las partes se someten expresamente a los juzgados y tribunales de Ibiza.",
]

export default function ContratoPDF({ contract, booking }: { contract: any; booking: any }) {
  const client = booking?.client
  const boat = booking?.boat

  const field = (label: string, value: string | undefined | null) =>
    value ? (
      <View style={styles.cell}>
        <Text style={styles.cellLabel}>{label}</Text>
        <Text style={styles.cellValue}>{value}</Text>
      </View>
    ) : null

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <Image style={styles.logo} src="/3.png" />
        <Text style={styles.title}>Contrato de Alquiler Náutico</Text>
        <Text style={styles.subtitle}>Black Boats Ibiza · Ibiza, España</Text>

        {/* Datos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos de la Reserva</Text>
          <View style={styles.grid}>
            {field('Cliente', client ? `${client.first_name} ${client.last_name}` : null)}
            {field('DNI / Pasaporte', client?.id_number)}
            {field('Licencia náutica', client?.boat_license)}
            {field('Teléfono', client?.phone)}
            {field('Email', client?.email)}
            {field('Nacionalidad', client?.nationality)}
            {field('Embarcación', boat?.name)}
            {field('Modalidad', booking?.rental_type === 'bareboat' ? 'Sin patrón' : 'Con patrón')}
            {field('Fecha de salida', booking?.start_date ? new Date(booking.start_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : null)}
            {field('Hora de salida', booking?.start_time?.slice(0, 5))}
            {field('Hora de regreso', booking?.end_time?.slice(0, 5))}
            {field('Pasajeros', booking?.adults ? `${booking.adults} adultos${booking.children > 0 ? ` · ${booking.children} niños` : ''}` : null)}
            {field('Capitán', booking?.captain_id)}
            <View style={styles.cell}>
              <Text style={styles.cellLabel}>Importe total</Text>
              <Text style={styles.cellValueBold}>{booking?.total_price ? `${Number(booking.total_price).toLocaleString('es-ES')} €` : '—'}</Text>
            </View>
          </View>
        </View>

        {/* T&C */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Términos y Condiciones de Alquiler Náutico</Text>
          {TERMINOS.map((t, i) => (
            <View key={i} style={styles.termRow}>
              <Text style={styles.termNum}>{i + 1}.</Text>
              <Text style={styles.termText}>{t}</Text>
            </View>
          ))}
        </View>

        {/* Firma */}
        {contract?.status === 'signed' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Firma del Arrendatario</Text>
            <View style={styles.grid}>
              {field('Firmado por', contract.signed_name)}
              {field('Fecha y hora', contract.signed_at ? new Date(contract.signed_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null)}
            </View>
            {contract.signature_data && (
              <View style={styles.signatureBox}>
                <Image style={styles.signatureImg} src={contract.signature_data} />
              </View>
            )}
          </View>
        )}

        <Text style={styles.footer}>Black Boats Ibiza © 2025 · Ibiza, España</Text>
      </Page>
    </Document>
  )
}
