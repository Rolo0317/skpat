import { enlaceWhatsapp } from '../utilidades/whatsapp'

/** Línea de reservas publicada en Instagram: respaldo cuando aún no hay gestores activos en /settings. */
const TELEFONO = { visible: '319 543 5288', internacional: '+573195435288' } as const

/** Datos públicos del negocio: una sola fuente para la landing, el SEO y el JSON-LD. */
export const NEGOCIO = {
  telefono: TELEFONO,
  nombre: 'Skpat VIP',
  eslogan: 'Electrónica y guaracha en Bogotá',
  /** La dirección exacta la define el admin en /settings; aquí solo lo que no cambia. */
  direccion: {
    sector: 'Plaza de las Américas',
    ciudad: 'Bogotá',
    region: 'Bogotá D.C.',
    pais: 'CO',
  },
  horario: {
    dias: 'Viernes a lunes',
    diasCortos: 'Vie–Lun',
    texto: 'Sin límite de horario',
    /** Días abiertos según schema.org; sin hora de cierre se publica como abierto todo el día. */
    diasSchema: ['Friday', 'Saturday', 'Sunday', 'Monday'],
  },
  redes: {
    instagram: { nombre: 'Instagram', usuario: '@skpat.vip', url: 'https://www.instagram.com/skpat.vip/' },
    tiktok: { nombre: 'TikTok', usuario: '@skpat.vip', url: 'https://www.tiktok.com/@skpat.vip' },
    facebook: { nombre: 'Facebook', usuario: 'SKPAT', url: 'https://www.facebook.com/profile.php?id=100072123812559' },
    whatsapp: {
      nombre: 'WhatsApp',
      usuario: TELEFONO.visible,
      url: enlaceWhatsapp(TELEFONO.internacional, 'Hola SKPAT, quiero información y reservas'),
    },
  },
  zonaHoraria: 'America/Bogota',
  edadMinima: 18,
  consumoObligatorio: true,
} as const

/** Rutas de la app React y de Astro a las que apuntan los CTA. */
export const RUTAS_APP = {
  comprar: (eventoId: string) => `/comprar/${encodeURIComponent(eventoId)}`,
  lista: (eventoId: string) => `/comprar/${encodeURIComponent(eventoId)}?tipo=lista`,
  login: '/login',
  registro: '/register',
  cliente: '/cliente',
} as const

export type IdRed = keyof typeof NEGOCIO.redes

/** Redes en el orden en que se muestran; el id también es el nombre del icono. */
export const REDES = (Object.keys(NEGOCIO.redes) as IdRed[]).map((id) => ({ id, ...NEGOCIO.redes[id] }))
