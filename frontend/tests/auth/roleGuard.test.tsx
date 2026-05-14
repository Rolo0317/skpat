import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RoleGuard } from '@/routes/guards/RoleGuard'
import { AuthContext, type AuthContextValue } from '@/features/auth/AuthContext'

function renderWithAuth(
  ctx: Partial<AuthContextValue>,
  initialEntries: string[] = ['/admin'],
) {
  const value: AuthContextValue = {
    user: null,
    role: null,
    loading: false,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => {},
    refreshToken: async () => {},
    ...ctx,
  }
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route element={<RoleGuard allowedRoles={['admin']} />}>
            <Route path="/admin" element={<div>Admin Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('RoleGuard component', () => {
  it('renders loading state while auth context resolves', () => {
    renderWithAuth({ loading: true })
    expect(screen.getByTestId('auth-loading')).toBeInTheDocument()
  })

  it('redirects unauthenticated user to /login', () => {
    renderWithAuth({ user: null, role: null })
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('redirects user with wrong role to /unauthorized', () => {
    renderWithAuth({ user: { id: 'u1', email: 'a@b.com', role: 'cliente', nombre: 'Test' }, role: 'cliente' })
    expect(screen.getByText('Unauthorized Page')).toBeInTheDocument()
  })

  it('renders Outlet for user whose role is in allowedRoles', () => {
    renderWithAuth({ user: { id: 'u1', email: 'a@b.com', role: 'admin', nombre: 'Admin' }, role: 'admin' })
    expect(screen.getByText('Admin Content')).toBeInTheDocument()
  })
})
