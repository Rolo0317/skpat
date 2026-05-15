import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MapSection } from '../MapSection'

describe('MapSection', () => {
  it('renders an iframe with title "Ubicación Skpat VIP"', () => {
    render(<MapSection />)
    const iframe = screen.getByTitle(/Ubicación/i)
    expect(iframe.tagName).toBe('IFRAME')
  })

  it('renders address Cra. 15 #93-47', () => {
    render(<MapSection />)
    expect(screen.getByText(/Cra\. 15 #93-47/)).toBeInTheDocument()
  })
})
