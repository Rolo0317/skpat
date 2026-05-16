import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QrScannerWidget } from '../QrScannerWidget'

// Mock qr-scanner — jsdom has no real camera/getUserMedia
vi.mock('qr-scanner', () => {
  class MockQrScanner {
    static WORKER_PATH = ''
    start = vi.fn().mockResolvedValue(undefined)
    stop = vi.fn()
    destroy = vi.fn()
    constructor(_video: HTMLVideoElement, _onResult: unknown, _options?: unknown) {}
  }
  return { default: MockQrScanner }
})

// Mock the worker URL import (?url) — jsdom doesn't resolve it
vi.mock('qr-scanner/qr-scanner-worker.min.js?url', () => ({
  default: '/mock-worker.js',
}))

describe('QrScannerWidget', () => {
  it('renders a video element inside a scanner box when active', () => {
    const onScan = vi.fn()
    render(<QrScannerWidget onScan={onScan} active={true} />)
    expect(screen.getByTestId('qr-scanner-box')).toBeDefined()
    const video = screen.getByTestId('qr-scanner-box').querySelector('video')
    expect(video).not.toBeNull()
  })

  it('renders even when inactive (does not start scanner)', () => {
    const onScan = vi.fn()
    render(<QrScannerWidget onScan={onScan} active={false} />)
    expect(screen.getByTestId('qr-scanner-box')).toBeDefined()
  })
})
