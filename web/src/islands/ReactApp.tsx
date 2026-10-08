import App from '@/App'
import { FullPageRedirect } from '@/routes/FullPageRedirect'

const ASTRO_LANDING_PATH = '/'

/** Isla que monta la app React existente; '/' pertenece a la landing de Astro. */
export default function ReactApp() {
  return <App homeElement={<FullPageRedirect to={ASTRO_LANDING_PATH} />} />
}
