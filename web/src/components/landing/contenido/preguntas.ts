import type { AjustesLugar } from '~/lib/data'
import { NEGOCIO } from './negocio'
import { textoDireccion } from '../utilidades/contacto'

export interface PreguntaFrecuente {
  pregunta: string
  respuesta: string
}

/** Preguntas frecuentes del negocio real; la dirección sale de /settings. */
export function preguntasFrecuentes(ajustes: AjustesLugar): PreguntaFrecuente[] {
  return [
    {
      pregunta: '¿Qué días abren y hasta qué hora?',
      respuesta: `${NEGOCIO.horario.dias}, ${NEGOCIO.horario.texto.toLowerCase()}. Estamos en ${textoDireccion(ajustes)}, ${NEGOCIO.direccion.ciudad}.`,
    },
    {
      pregunta: '¿Por qué el precio cambia por etapas?',
      respuesta:
        'Cada evento sale a la venta por etapas: la primera es la más barata y, cuando se acaba, sube a la siguiente. El día del evento aplica el precio de taquilla. Entre más pronto compres, menos pagas.',
    },
    {
      pregunta: '¿Cómo pago mi entrada, palco o mesa?',
      respuesta:
        'Por ahora no hay pago en línea: al comprar o reservar queda pendiente y te llevamos a WhatsApp con un gestor para cerrar el pago. Cuando el gestor lo confirma, tu QR queda activo y te llega al correo.',
    },
    {
      pregunta: '¿Cómo funciona el QR?',
      respuesta:
        'Cada persona tiene su propio QR y solo vale para la fecha de su evento. En la puerta lo escaneamos desde tu celular; no necesitas imprimir nada.',
    },
    {
      pregunta: '¿Cómo entro por lista?',
      respuesta:
        'La lista es gratis: te inscribes con el enlace que te comparte tu gestor y recibes tu QR al instante para guardarlo en tu celular.',
    },
    {
      pregunta: '¿Cómo reservo un palco o una mesa?',
      respuesta:
        'En el mapa de palcos eliges uno disponible, ves qué incluye, llenas tus datos y terminas el pago por WhatsApp. Un palco o mesa confirmado genera un QR por cada persona incluida.',
    },
    {
      pregunta: '¿Hay consumo obligatorio?',
      respuesta: 'Sí. Los palcos y mesas ya incluyen botella y productos; si vienes en general, tu gestor te cuenta las opciones.',
    },
    {
      pregunta: '¿Dan clases de DJ?',
      respuesta:
        'Sí. Skpat también es agencia de DJs: tenemos cursos y clases para aprender desde cero y representamos DJs para eventos. Escríbenos por WhatsApp y te contamos horarios y valores.',
    },
    {
      pregunta: '¿Hay edad mínima?',
      respuesta: `Sí. Solo mayores de ${NEGOCIO.edadMinima} años, con documento de identidad original.`,
    },
  ]
}
