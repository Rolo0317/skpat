# Skpat VIP — Sistema Integral de Discoteca

## What This Is

Ecosistema digital completo para Skpat VIP, discoteca de música electrónica y guaracha en Colombia. Incluye landing pública con boletería digital, sistema de mesas y meseros PWA, inventario con dashboard en tiempo real, y agente IA. El dueño puede gestionar todo el negocio desde una sola plataforma sin depender de manillas físicas ni procesos manuales.

## Core Value

El asistente o cliente puede comprar su tiquete desde la web con QR de entrada, y el dueño ve en tiempo real cuánto está vendiendo en la noche — eliminando costos operativos y capturando datos de cada asistente.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Landing pública con identidad visual Skpat, nueva ubicación y eventos
- [ ] Boletería digital con tarifas dinámicas por hora de llegada y QR único por persona
- [ ] Captura de datos de asistentes (nombre, cédula, edad, teléfono, email)
- [ ] Sistema de mesas con QR fijo por mesa → carta digital → pedido a mesero
- [ ] App PWA para meseros: recibir pedidos, confirmar pagos, ver sus ventas
- [ ] Portero puede escanear QR de entrada para validar acceso
- [ ] Dashboard administrador: ventas en tiempo real por noche/semana/mes
- [ ] Inventario con descuento automático por pedido y alertas de stock bajo
- [ ] Sistema de palcos/reservas VIP desde la web
- [ ] Agente IA en la página respondiendo preguntas del negocio
- [ ] Blog/cartelera de eventos con flyers

### Out of Scope

- WhatsApp Business API — diferida para fase posterior (v2)
- App móvil nativa — web-first con PWA
- OAuth / login social — email/password suficiente para v1
- Integración con Spotify/SoundCloud — nice-to-have, diferida

## Context

- **Cliente:** Discoteca Skpat VIP, Colombia — música electrónica y guaracha
- **Identidad visual:** Tomar del Instagram @skpat.vip (colores, vibe, tipografía)
- **Ubicación:** Nueva locación (actualizar en la página web)
- **Pagos Colombia:** PayU o Wompi (PSE, Nequi, tarjetas)
- **Stack ya iniciado:** Vite scaffold en `/` con Node.js — greenfield real
- **Objetivo inmediato:** Tener algo funcionable para mostrar al cliente rápido

## Constraints

- **Tech Frontend:** Vite + React + Tailwind CSS — modular, sin Next.js
- **Tech Backend:** Node.js con Express o Fastify — API REST modular
- **Base de datos:** PostgreSQL vía Supabase — auth incluido, realtime para dashboard
- **Seguridad:** Hashing con bcrypt/argon2, JWT para sesiones, encriptación de datos sensibles (cédula, teléfono)
- **Pagos:** PayU o Wompi (integración Colombia)
- **Hosting:** Vercel (frontend) + Railway/Render (backend) — budget ~$50-150 USD/mes
- **Diseño:** Llamativo, dark theme, vibe discoteca electrónica
- **Roles:** Cliente, Mesero, Portero/Scanner, Administrador

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vite + React en lugar de Next.js | Requerimiento explícito del desarrollador | — Pending |
| Supabase como BaaS | Auth + realtime + PostgreSQL en uno, dentro del presupuesto | — Pending |
| PWA para meseros en lugar de app nativa | Sin instalación, funciona en cualquier teléfono del personal | — Pending |
| WhatsApp diferido a v2 | Número nuevo requiere proceso oficial de Meta, no bloquea el core | — Pending |
| Número nuevo de WhatsApp cuando se implemente | Número existente migrado pierde historial y no puede usarse simultáneamente | — Pending |

---
*Last updated: 2026-05-14 after initialization*
