# Roadmap: Skpat VIP — Sistema Integral de Discoteca

## Overview

El proyecto arranca con la capa de seguridad y autenticación que todo el sistema necesita, luego construye la landing pública que da identidad al negocio, después el flujo de boletería digital con QR para que clientes compren y el portero valide acceso, luego el sistema de mesas y PWA para meseros, y finaliza con el inventario y dashboard en tiempo real que le da al dueño visibilidad total del negocio noche a noche.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Fundacion y Seguridad** - Infraestructura base, autenticación segura y roles de usuario (completed 2026-05-14)
- [x] **Phase 2: Landing Publica** - Página pública con identidad visual, eventos, ubicación y agente IA (completed 2026-05-15)
- [ ] **Phase 3: Boleteria y Acceso** - Compra de tiquetes con QR único, validación en puerta y gestión de eventos
- [ ] **Phase 4: Mesas y Meseros** - QR por mesa, carta digital y panel PWA para meseros
- [ ] **Phase 5: Inventario y Dashboard** - Inventario en tiempo real, descuento automático y dashboard de ventas

## Phase Details

### Phase 1: Fundacion y Seguridad
**Goal**: El sistema tiene infraestructura segura con autenticación funcional y roles diferenciados para los 4 tipos de usuario
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, AUTH-09
**Success Criteria** (what must be TRUE):
  1. Un usuario puede registrarse con email y contraseña y recibir acceso a su panel correspondiente según su rol
  2. Un usuario puede cerrar sesión, recargar la página e iniciar sesión de nuevo sin perder su estado
  3. Un usuario puede solicitar recuperación de contraseña y recibir un link funcional por email
  4. Un Administrador ve su panel, un Mesero el suyo, un Portero el suyo — nadie accede a la vista del otro sin autorización
  5. Los secretos, contraseñas y datos sensibles (cédula, teléfono) nunca aparecen en texto plano en logs, código ni base de datos
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Monorepo scaffolding (frontend/ + backend/), env templates, SQLite db singleton, Wave 0 test stubs [AUTH-09]
- [ ] 01-02-PLAN.md — Backend auth: register/login/refresh/recover/me + JWKS verification, AES-256-GCM PII encryption, argon2 secret hasher, rate limiting, zod validation [AUTH-01, AUTH-02, AUTH-05, AUTH-06, AUTH-07, AUTH-08]
- [ ] 01-03-PLAN.md — Admin assign-role endpoint, AuthContext, RoleGuard, 4 panel shells (Admin/Mesero/Portero/Cliente), Login/Register/Recover/Reset pages [AUTH-03, AUTH-04]

### Phase 2: Landing Publica
**Goal**: Cualquier persona puede visitar la página de Skpat VIP, ver los próximos eventos, encontrar la ubicación y obtener respuestas del agente IA
**Depends on**: Phase 1
**Requirements**: LAND-01, LAND-02, LAND-03, LAND-04, LAND-05
**Success Criteria** (what must be TRUE):
  1. Al abrir la landing, un visitante ve el hero con la identidad visual Skpat (dark theme, colores, tipografía) sin necesidad de cuenta
  2. Un visitante puede ver la cartelera de eventos con flyers, fechas y descripciones actualizadas por el admin
  3. Un visitante puede ver el mapa con la ubicación actual del local (Google Maps embed)
  4. Un visitante puede hacerle preguntas al agente IA (horarios, precios, eventos) y recibir respuestas coherentes sobre el negocio
  5. Un visitante puede ver la sección de palcos VIP y sus opciones de reserva desde la landing
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md — Hero + Events (SQLite + multipart + admin CRUD) + MapSection + Navbar; / route público [LAND-01, LAND-02, LAND-03]
- [ ] 02-02-PLAN.md — VipSection (Silver/Gold/Platinum) + AiChatWidget con streaming SSE proxy a Claude (haiku 4.5) + ANTHROPIC_API_KEY en backend env [LAND-04, LAND-05]

### Phase 3: Boleteria y Acceso
**Goal**: Un cliente puede comprar su tiquete desde la web, recibir un QR único por email, y el portero puede validar ese QR en la entrada — el admin gestiona eventos y ve la lista de asistentes
**Depends on**: Phase 2
**Requirements**: TICK-01, TICK-02, TICK-03, TICK-04, TICK-05, TICK-06, TICK-07
**Success Criteria** (what must be TRUE):
  1. Un cliente puede completar la compra de un tiquete y recibir su QR único por email en menos de 2 minutos
  2. Un portero puede escanear el QR con su teléfono y ver inmediatamente si el acceso es válido, ya usado o inválido
  3. Un cliente puede reservar un palco VIP desde la web con precio especial y recibir confirmación
  4. El admin puede crear un evento con precio base y ver la lista de asistentes con su estado de entrada en tiempo real
  5. Intentar reutilizar el mismo QR en la entrada muestra error de "ya escaneado" al portero
**Plans**: TBD

Plans:
- [ ] 03-01: Backend de eventos y boletería — modelo de datos, CRUD de eventos por admin, precios base
- [ ] 03-02: Flujo de compra de tiquetes — checkout, generación de QR único, envío por email
- [ ] 03-03: Validación en puerta y palcos VIP — panel del portero con escáner QR, reserva de palcos, lista de asistentes para admin

### Phase 4: Mesas y Meseros
**Goal**: El cliente escanea el QR de su mesa y ve la carta digital; el mesero tiene un panel PWA donde ve los pedidos de la noche y sus ventas; el admin ve el comparativo por mesero
**Depends on**: Phase 3
**Requirements**: MESA-01, MESA-02, MESA-03, MESA-04
**Success Criteria** (what must be TRUE):
  1. Un cliente escanea el QR fijo de una mesa con su teléfono y ve la carta digital sin instalar nada ni crear cuenta
  2. El admin puede agregar, editar o deshabilitar productos y precios en la carta desde su panel y los cambios se reflejan inmediatamente
  3. Un mesero puede ver en su panel las ventas que ha registrado durante la noche actual
  4. El admin puede ver un dashboard comparativo de ventas por mesero en la noche (quién vendió más, totales)
**Plans**: TBD

Plans:
- [ ] 04-01: QR de mesas y carta digital — generación de QR fijo por mesa, vista pública de carta, gestión de carta por admin
- [ ] 04-02: Panel PWA del mesero — registro de ventas, vista de ventas propias de la noche, dashboard comparativo en admin

### Phase 5: Inventario y Dashboard
**Goal**: Cada venta descuenta automáticamente del inventario; el admin recibe alertas de stock bajo y ve el dashboard en tiempo real con gráficas de ventas por noche, semana y mes
**Depends on**: Phase 4
**Requirements**: INV-01, INV-02, INV-03, INV-04, INV-05, INV-06
**Success Criteria** (what must be TRUE):
  1. El admin puede cargar el stock inicial de cada producto y ver el inventario actual en cualquier momento
  2. Después de que el mesero registra una venta, el stock del producto baja automáticamente sin acción manual
  3. Cuando un producto cae por debajo del mínimo configurado, el admin ve una alerta visual en su panel
  4. El admin puede ver gráficas de ventas en tiempo real: ingresos de la noche actual, semana y mes
  5. El admin puede filtrar el dashboard por producto, mesero, hora y evento — y ver el desglose de ingresos por boletería vs ventas en mesa
**Plans**: TBD

Plans:
- [ ] 05-01: Módulo de inventario — carga de stock, descuento automático por venta, alertas de stock mínimo
- [ ] 05-02: Dashboard en tiempo real — gráficas Supabase realtime, filtros por producto/mesero/hora/evento, desglose boletería vs mesas

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Fundacion y Seguridad | 3/3 | Complete    | 2026-05-15 |
| 2. Landing Publica | 2/2 | Complete   | 2026-05-15 |
| 3. Boleteria y Acceso | 0/3 | Not started | - |
| 4. Mesas y Meseros | 0/2 | Not started | - |
| 5. Inventario y Dashboard | 0/2 | Not started | - |
