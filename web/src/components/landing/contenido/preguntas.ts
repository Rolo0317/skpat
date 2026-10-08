import { NEGOCIO } from './negocio'
import { TARIFAS } from './tarifas'
import { formatoCOP } from '../utilidades/formato'

export interface PreguntaFrecuente {
  pregunta: string
  respuesta: string
}

const resumenTarifas = TARIFAS.map((t) => `${t.rango.toLowerCase()}, ${formatoCOP(t.precioCentavos)}`).join('; ')

export const PREGUNTAS_FRECUENTES: readonly PreguntaFrecuente[] = [
  {
    pregunta: '¿Qué días abren?',
    respuesta: `${NEGOCIO.horario.dias}, de ${NEGOCIO.horario.texto}, en ${NEGOCIO.direccion.calle}, ${NEGOCIO.direccion.ciudad}.`,
  },
  {
    pregunta: '¿Por qué el cover cambia según la hora?',
    respuesta: `Premiamos a quien llega temprano: ${resumenTarifas}. Entre más temprano llegues, menos pagas.`,
  },
  {
    pregunta: '¿Cómo recibo mi entrada?',
    respuesta: 'Al comprar te llega un correo con tu código QR. En la puerta lo escaneamos desde tu celular; no necesitas imprimir nada.',
  },
  {
    pregunta: '¿Necesito crear una cuenta para comprar?',
    respuesta: 'No es obligatorio, pero con tu cuenta ves todas tus entradas en un solo lugar y las recuperas si borras el correo.',
  },
  {
    pregunta: '¿Cómo reservo un palco?',
    respuesta: 'Elige Silver, Gold o Platinum en la sección de palcos y completa la compra para la fecha que quieras. Recibes la confirmación con QR al correo.',
  },
  {
    pregunta: '¿Cómo pido en mi mesa?',
    respuesta: 'Escanea el QR de tu mesa para ver la carta con precios. Tu mesero toma el pedido y el pago: efectivo, Nequi o transferencia.',
  },
  {
    pregunta: '¿Hay edad mínima?',
    respuesta: `Sí. Solo mayores de ${NEGOCIO.edadMinima} años, con documento de identidad original.`,
  },
]
