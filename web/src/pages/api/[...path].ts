import type { APIRoute } from 'astro'
import { getBackend } from '~/lib/backend'

export const prerender = false

const BODYLESS_METHODS = new Set(['GET', 'HEAD'])
type InjectMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

/**
 * Puente Astro → Fastify: la API existente corre sin cambios dentro de la función serverless de Vercel.
 * /api/events → /events en Fastify.
 */
export const ALL: APIRoute = async ({ request, params, clientAddress }) => {
  const app = await getBackend()
  const { search } = new URL(request.url)
  const method = request.method.toUpperCase() as InjectMethod

  const response = await app.inject({
    method,
    url: `/${params.path ?? ''}${search}`,
    headers: Object.fromEntries(request.headers),
    payload: BODYLESS_METHODS.has(method) ? undefined : Buffer.from(await request.arrayBuffer()),
    remoteAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? clientAddress,
  })

  const headers = new Headers()
  for (const [name, value] of Object.entries(response.headers)) {
    if (value === undefined || name === 'content-length' || name === 'transfer-encoding') continue
    for (const item of Array.isArray(value) ? value : [value]) headers.append(name, String(item))
  }
  return new Response(method === 'HEAD' ? null : response.rawPayload, {
    status: response.statusCode,
    headers,
  })
}
