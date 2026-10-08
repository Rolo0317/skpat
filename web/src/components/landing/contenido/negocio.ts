/** Datos públicos del negocio: una sola fuente para la landing, el SEO y el JSON-LD. */
export const NEGOCIO = {
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
  instagram: {
    usuario: '@skpat.vip',
    url: 'https://www.instagram.com/skpat.vip/',
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
  login: '/login',
  registro: '/register',
  cliente: '/cliente',
} as const
