import { describe, it } from 'vitest'

// Covers AUTH-04 — role-based route guards.
// Implementation lands in plan 01-03.
describe('RoleGuard component', () => {
  it.todo('redirects unauthenticated user to /login')
  it.todo('redirects user with wrong role to /unauthorized')
  it.todo('renders Outlet for user whose role is in allowedRoles')
  it.todo('renders loading state while auth context resolves')
})
