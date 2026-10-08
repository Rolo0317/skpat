import { NEGOCIO } from './negocio'

/** Video destacado del 5.º aniversario, publicado en el TikTok oficial. */
const ID_ANIVERSARIO = '7666219825575759105'

/** Parámetros del reproductor oficial de TikTok: sin recomendaciones al final y en bucle. */
const PARAMETROS_REPRODUCTOR = new URLSearchParams({
  autoplay: '1',
  loop: '1',
  rel: '0',
  description: '1',
  music_info: '1',
}).toString()

export const VIDEO_ANIVERSARIO = {
  anios: 5,
  titulo: '5 años encendiendo Bogotá',
  descripcion:
    'Cinco años de guaracha, electrónica y noches que no se olvidan. Así celebramos el aniversario: dale play y vívelo otra vez.',
  urlPublica: `${NEGOCIO.redes.tiktok.url}/video/${ID_ANIVERSARIO}`,
  urlReproductor: `https://www.tiktok.com/player/v1/${ID_ANIVERSARIO}?${PARAMETROS_REPRODUCTOR}`,
} as const
