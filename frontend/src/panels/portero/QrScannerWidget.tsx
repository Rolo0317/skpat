import { useEffect, useRef } from 'react'
import QrScanner from 'qr-scanner'
// Vite ?url import — resolves worker file as static asset URL.
// CRITICAL: without this, qr-scanner cannot decode frames.
import workerUrl from 'qr-scanner/qr-scanner-worker.min.js?url'

QrScanner.WORKER_PATH = workerUrl

export interface QrScannerWidgetProps {
  onScan: (token: string) => void
  active: boolean
}

export function QrScannerWidget({ onScan, active }: QrScannerWidgetProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<QrScanner | null>(null)

  useEffect(() => {
    if (!active || !videoRef.current) return
    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        onScan(result.data)
        scanner.stop()
      },
      { returnDetailedScanResult: true, preferredCamera: 'environment' }
    )
    scannerRef.current = scanner
    scanner.start().catch((err) => {
      // Camera permission denied or HTTPS missing — surface via console
      console.error('[QrScanner] start failed:', err)
    })
    return () => {
      scanner.destroy()
      scannerRef.current = null
    }
  }, [active, onScan])

  return (
    <div
      data-testid="qr-scanner-box"
      style={{
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        aspectRatio: '1',
        background: '#0a0a18',
        border: '2px solid #3a3022',
      }}
    >
      <video
        ref={videoRef}
        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
      />
      {active && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: 'linear-gradient(90deg, transparent, #d4a63a, transparent)',
            animation: 'scan 2.5s ease-in-out infinite',
          }}
        />
      )}
    </div>
  )
}
