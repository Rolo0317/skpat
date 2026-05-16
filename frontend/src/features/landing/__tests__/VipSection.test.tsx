import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { VipSection } from '../VipSection'

describe('VipSection', () => {
  it('renders heading "Palcos VIP"', () => {
    render(<MemoryRouter><VipSection /></MemoryRouter>)
    expect(screen.getByText(/Palcos/i)).toBeInTheDocument()
    expect(screen.getByText(/VIP/i)).toBeInTheDocument()
  })

  it('renders 3 palco tier cards Silver, Gold, Platinum', () => {
    render(<MemoryRouter><VipSection /></MemoryRouter>)
    expect(screen.getByText('Palco Silver')).toBeInTheDocument()
    expect(screen.getByText('Palco Gold')).toBeInTheDocument()
    expect(screen.getByText('Palco Platinum')).toBeInTheDocument()
  })

  it('renders prices $450.000, $850.000, $1.500.000', () => {
    render(<MemoryRouter><VipSection /></MemoryRouter>)
    expect(screen.getByText('$450.000')).toBeInTheDocument()
    expect(screen.getByText('$850.000')).toBeInTheDocument()
    expect(screen.getByText('$1.500.000')).toBeInTheDocument()
  })

  it('renders MÁS POPULAR badge on the Gold tier', () => {
    render(<MemoryRouter><VipSection /></MemoryRouter>)
    expect(screen.getByText('MÁS POPULAR')).toBeInTheDocument()
  })

  it('renders 3 Reservar CTA buttons that open reservation form', () => {
    render(<MemoryRouter><VipSection /></MemoryRouter>)
    const ctas = screen.getAllByText('Reservar')
    expect(ctas).toHaveLength(3)
    ctas.forEach((cta) => {
      expect(cta.tagName.toLowerCase()).toBe('button')
    })
  })
})
