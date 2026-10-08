import { vi } from 'vitest'
import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { API_BASE_URL } from '@/lib/api'

/** Respuesta HTTP JSON real, como la que entrega fetch. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

interface RenderOptions {
  path?: string
  route?: string
}

/** Renderiza con React Query (sin reintentos) y un router en memoria en la ruta indicada. */
export function renderWithProviders(ui: ReactElement, { path = '/', route = path }: RenderOptions = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

type RouteHandler = (init: RequestInit) => Response
type FetchArgs = [input: RequestInfo | URL, init?: RequestInit]

function apiPathOf(input: RequestInfo | URL): string {
  return String(input).slice(API_BASE_URL.length)
}

/**
 * Sustituye fetch por un enrutador "MÉTODO /ruta" -> respuesta, con rutas relativas a API_BASE_URL.
 * Las rutas no declaradas responden 404.
 * Devuelve el mock para inspeccionar las llamadas.
 */
export function stubFetchRoutes(routes: Record<string, RouteHandler>) {
  const fetchMock = vi.fn(async (...[input, init = {}]: FetchArgs) => {
    const key = `${init.method ?? 'GET'} ${apiPathOf(input)}`
    return routes[key]?.(init) ?? jsonResponse({ error: 'NotFound' }, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Llamadas a fetch hechas a una ruta de la API. */
export function callsTo(fetchMock: ReturnType<typeof stubFetchRoutes>, path: string) {
  return fetchMock.mock.calls.filter(([input]) => apiPathOf(input) === path)
}

/** Cuerpo JSON enviado en la llamada a fetch que coincide con método y ruta de la API. */
export function sentBody(fetchMock: ReturnType<typeof stubFetchRoutes>, method: string, path: string): unknown {
  const call = callsTo(fetchMock, path).find(([, init]) => init?.method === method)
  return call?.[1]?.body ? JSON.parse(String(call[1].body)) : undefined
}
