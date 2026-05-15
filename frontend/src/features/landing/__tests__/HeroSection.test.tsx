import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HeroSection } from '../HeroSection'

describe('HeroSection', () => {
  it('renders SKPAT logo with gradient-text class', () => {
    render(<HeroSection />)
    const logo = screen.getByText('SKPAT')
    expect(logo).toBeInTheDocument()
    expect(logo.className).toMatch(/gradient-text/)
  })

  it('renders V I P subtitle', () => {
    render(<HeroSection />)
    expect(screen.getByText('V I P')).toBeInTheDocument()
  })

  it('renders 3 stat-items with numbers 5K+, 48, 12', () => {
    render(<HeroSection />)
    expect(screen.getByText('5K+')).toBeInTheDocument()
    expect(screen.getByText('48')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('renders Comprar tiquetes CTA linking to /login', () => {
    render(<HeroSection />)
    const cta = screen.getByText(/Comprar tiquetes/i).closest('a')
    expect(cta?.getAttribute('href')).toBe('/login')
  })
})
