/** Línea de reservas (WhatsApp) publicada en Instagram y en los flyers. */
const TELEFONO = { visible: '319 543 5288', internacional: '+573195435288' } as const

/** Datos públicos del negocio: una sola fuente para la landing, el SEO y el JSON-LD. */
export const NEGOCIO = {
  telefono: TELEFONO,
  nombre: 'Skpat VIP',
  eslogan: 'Electrónica y guaracha en Bogotá',
  direccion: {
    calle: 'Cra. 15 #93-47',
    ciudad: 'Bogotá',
    region: 'Bogotá D.C.',
    pais: 'CO',
  },
  horario: {
    dias: 'Viernes y sábado',
    diasCortos: 'Vie–Sáb',
    apertura: '21:00',
    cierre: '04:00',
    texto: '9 PM – 4 AM',
  },
  redes: {
    instagram: { nombre: 'Instagram', usuario: '@skpat.vip', url: 'https://www.instagram.com/skpat.vip/' },
    tiktok: { nombre: 'TikTok', usuario: '@skpat.vip', url: 'https://www.tiktok.com/@skpat.vip' },
    facebook: { nombre: 'Facebook', usuario: 'SKPAT', url: 'https://www.facebook.com/profile.php?id=100072123812559' },
    whatsapp: {
      nombre: 'WhatsApp',
      usuario: TELEFONO.visible,
      url: `https://wa.me/${TELEFONO.internacional.slice(1)}?text=${encodeURIComponent('Hola SKPAT, quiero información y reservas')}`,
    },
  },
  zonaHoraria: 'America/Bogota',
  edadMinima: 18,
} as const

const DIRECCION_BUSQUEDA = encodeURIComponent(`${NEGOCIO.direccion.calle}, ${NEGOCIO.direccion.ciudad}, Colombia`)

export const ENLACES_MAPA = {
  google: `https://www.google.com/maps/search/?api=1&query=${DIRECCION_BUSQUEDA}`,
  waze: `https://waze.com/ul?q=${DIRECCION_BUSQUEDA}&navigate=yes`,
} as const

/** Rutas de la app React a las que apuntan los CTA. */
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
