import { useState, type ReactNode } from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppRouter } from './routes'
import { AuthProvider } from './features/auth/AuthContext'

interface AppProps {
  /** Lo que se muestra en '/': la landing React en solitario, o una salida a la landing de Astro. */
  homeElement: ReactNode
}

export default function App({ homeElement }: AppProps) {
  const [queryClient] = useState(() => new QueryClient())
  const [router] = useState(() => createAppRouter(homeElement))

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  )
}
