import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Navbar } from '../Navbar'

describe('Navbar', () => {
  it('renders Comprar tiquetes link to /login', () => {
    render(<MemoryRouter><Navbar /></MemoryRouter>)
    const link = screen.getByText(/Comprar tiquetes/i).closest('a')
    expect(link?.getAttribute('href')).toBe('/login')
  })

  it('renders Ver eventos link to #eventos', () => {
    render(<MemoryRouter><Navbar /></MemoryRouter>)
    const link = screen.getByText(/Ver eventos/i).closest('a')
    expect(link?.getAttribute('href')).toBe('#eventos')
  })
})
