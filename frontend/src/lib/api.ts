const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export const api = {
  get: (path: string, token?: string) =>
    fetch(`${BASE_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }),
  post: (path: string, body: unknown, token?: string) =>
    fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body)
    })
}
