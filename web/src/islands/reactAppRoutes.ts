/**
 * Rutas que atiende la app React (frontend/src/routes). Cualquier otra ruta responde el 404 de Astro.
 * Mantener sincronizado con el router de React al agregar secciones nuevas.
 */
const REACT_APP_ROUTES: readonly RegExp[] = [
  /^\/(login|register|recover|unauthorized)\/?$/,
  /^\/auth\/reset-password\/?$/,
  /^\/comprar\/[^/]+\/?$/,
  /^\/mesa\/[^/]+\/?$/,
  /^\/(admin|mesero|portero|cliente)(\/.*)?$/,
]

export function isReactAppRoute(pathname: string): boolean {
  return REACT_APP_ROUTES.some((route) => route.test(pathname))
}
