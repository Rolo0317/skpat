# Skpat VIP

Plataforma de la discoteca y agencia de DJs Skpat (sector Plaza de las Américas, Bogotá): venta de entradas, palcos y mesas por evento, con el pago cerrado por WhatsApp. También tiene panel de administración y escaneo de boletas con QR.

## Estructura (workspaces de npm)

```
backend/    API en Fastify (rutas bajo /api en producción)
frontend/   Panel de administración en React
web/        Sitio público en Astro: muestra el evento activo
supabase/   Migraciones del esquema
docs/       Contratos y reglas de negocio (fuente de verdad)
```

## Comandos

```bash
npm install
npm run dev            # sitio público (web)
npm run dev:frontend   # panel de administración
npm run dev:backend    # API
npm test               # pruebas de todos los workspaces
```

## Reglas clave

- **Sin pasarela de pago por ahora.** Toda compra nace en `pending_payment` y se cierra por WhatsApp con un gestor.
- Los montos se guardan en **centavos COP** y las fechas en ISO 8601.

El detalle está en `docs/contrato-operacion-eventos.md`.
