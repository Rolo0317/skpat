import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { postMock } = vi.hoisted(() => {
  const postMock = vi.fn().mockResolvedValue({ ok: true })
  return { postMock }
})

vi.mock('@/lib/api', () => ({
  api: { post: postMock, get: vi.fn(), patch: vi.fn(), del: vi.fn() },
}))

import RecoverPage from '@/features/auth/RecoverPage'

describe('RecoverPage (AUTH-03 frontend smoke)', () => {
  beforeEach(() => postMock.mockClear())

  it('calls /auth/recover and shows success message', async () => {
    render(
      <MemoryRouter>
        <RecoverPage />
      </MemoryRouter>
    )
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@skpat.com' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar enlace/i }))

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/auth/recover', { email: 'user@skpat.com' })
    )
    expect(await screen.findByTestId('recover-success')).toBeInTheDocument()
  })

  it('still shows success when api throws (no enumeration)', async () => {
    postMock.mockRejectedValueOnce(new Error('network'))
    render(
      <MemoryRouter>
        <RecoverPage />
      </MemoryRouter>
    )
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'unknown@skpat.com' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar enlace/i }))
    expect(await screen.findByTestId('recover-success')).toBeInTheDocument()
  })

  it('blocks submit when email is invalid (zod)', async () => {
    render(
      <MemoryRouter>
        <RecoverPage />
      </MemoryRouter>
    )
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'not-an-email' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar enlace/i }))
    await waitFor(() => expect(postMock).not.toHaveBeenCalled())
  })
})
