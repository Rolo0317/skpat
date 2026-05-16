# Requirements: Skpat VIP — Sistema Integral de Discoteca

**Defined:** 2026-05-14
**Core Value:** Cliente compra tiquete con QR desde la web; dueño ve ventas en tiempo real — sin manillas físicas ni procesos manuales.

## v1 Requirements

### Authentication

- [x] **AUTH-01**: Usuario puede registrarse con email y contraseña
- [x] **AUTH-02**: Usuario puede iniciar sesión y mantener sesión activa entre recargas (JWT)
- [x] **AUTH-03**: Usuario puede recuperar contraseña vía email con link seguro
- [x] **AUTH-04**: Sistema distingue roles: Cliente, Mesero, Portero, Administrador — con paneles distintos
- [x] **AUTH-05**: Contraseñas hasheadas con argon2 — nunca guardadas en texto plano
- [x] **AUTH-06**: Datos sensibles del cliente (cédula, teléfono) encriptados en base de datos
- [x] **AUTH-07**: Rate limiting en endpoints de auth para prevenir fuerza bruta
- [x] **AUTH-08**: Validación de inputs en frontend y backend (sanitización, longitudes, formatos)
- [x] **AUTH-09**: Secretos en variables de entorno — nunca en código fuente

### Landing Pública

- [x] **LAND-01**: Hero section con identidad visual Skpat VIP (dark theme, vibe electrónica/guaracha)
- [x] **LAND-02**: Cartelera de eventos con flyers (imagen, título, fecha, descripción)
- [x] **LAND-03**: Mapa con nueva ubicación de la discoteca (Google Maps embed)
- [x] **LAND-04**: Agente IA integrado en la página que responde preguntas del negocio (horarios, precios, ubicación, eventos)
- [x] **LAND-05**: Sección de palcos/reservas VIP visible desde la landing

### Boletería

- [x] **TICK-01**: Cliente puede comprar tiquete de entrada desde la web (flujo de checkout)
- [x] **TICK-02**: Sistema genera QR único e intransferible por persona al completar compra
- [x] **TICK-03**: QR enviado al email del cliente con datos de la entrada
- [x] **TICK-04**: Portero puede escanear el QR en la entrada para validar acceso
- [x] **TICK-05**: Admin puede crear y configurar eventos con precio base de entrada
- [x] **TICK-06**: Sistema de palcos VIP: cliente puede reservar palco con precio especial desde la web
- [x] **TICK-07**: Admin ve lista de asistentes por evento (nombre, cédula, hora de compra, estado QR)

### Mesas y Meseros

- [x] **MESA-01**: Cada mesa tiene un QR fijo que el cliente escanea para ver la carta digital
- [x] **MESA-02**: Carta digital actualizable por el admin (productos, precios, disponibilidad)
- [x] **MESA-03**: Mesero ve en su panel las ventas de la noche (lo que él ha registrado)
- [x] **MESA-04**: Admin ve dashboard de ventas por mesero (comparativo en la noche)

### Inventario y Dashboard

- [x] **INV-01**: Admin carga inventario base de productos (bebidas, combos) con stock inicial
- [x] **INV-02**: Cada venta/pedido confirmado descuenta automáticamente del inventario
- [x] **INV-03**: Alerta visual al admin cuando un producto cae por debajo del stock mínimo
- [x] **INV-04**: Dashboard con ventas en tiempo real: gráficas por noche, semana y mes
- [x] **INV-05**: Filtros en dashboard: por producto, por mesero, por hora, por evento
- [x] **INV-06**: Dashboard muestra ingresos totales por boletería vs ventas en mesa

## v2 Requirements

### Boletería Avanzada

- **TICK-V2-01**: Tarifas dinámicas por hora de llegada (más barato antes de las 10pm)
- **TICK-V2-02**: Integración pasarela de pagos real (PayU o Wompi — PSE, Nequi, tarjetas)
- **TICK-V2-03**: Manillas digitales NFC opcionales como complemento al QR

### Mesas y Pedidos

- **MESA-V2-01**: Cliente hace pedido desde el QR de mesa (sin llamar al mesero)
- **MESA-V2-02**: Pedido llega en tiempo real al teléfono del mesero (push notification)
- **MESA-V2-03**: Mesero confirma pago en la app (efectivo, Nequi, transferencia)
- **MESA-V2-04**: Cierre de caja automático por mesero al final de la noche

### WhatsApp Business

- **WA-V2-01**: Número nuevo dedicado de WhatsApp Business configurado
- **WA-V2-02**: Agente automático responde preguntas frecuentes por WhatsApp
- **WA-V2-03**: Plantillas de confirmación de compra enviadas por WhatsApp
- **WA-V2-04**: Campañas de promociones a base de datos de asistentes

### Notificaciones

- **NOTF-V2-01**: Push notifications al admin cuando stock cae a mínimo
- **NOTF-V2-02**: Email recordatorio 24h antes del evento a clientes con tiquete

## Out of Scope

| Feature | Reason |
|---------|--------|
| App móvil nativa (iOS/Android) | Web-first con PWA — suficiente para v1 y v2 |
| OAuth / login social (Google, etc.) | Email/password suficiente para el contexto |
| Integración Spotify/SoundCloud | Nice-to-have, no core |
| Sistema de encomiendas/guardarropa | Fuera del alcance del proyecto digital |
| Punto de venta (POS) con impresora | No aplica — pagos digitales/confirmación manual |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 — Fundacion y Seguridad | Complete |
| AUTH-02 | Phase 1 — Fundacion y Seguridad | Complete |
| AUTH-03 | Phase 1 — Fundacion y Seguridad | Complete |
| AUTH-04 | Phase 1 — Fundacion y Seguridad | Complete |
| AUTH-05 | Phase 1 — Fundacion y Seguridad | Complete |
| AUTH-06 | Phase 1 — Fundacion y Seguridad | Complete |
| AUTH-07 | Phase 1 — Fundacion y Seguridad | Complete |
| AUTH-08 | Phase 1 — Fundacion y Seguridad | Complete |
| AUTH-09 | Phase 1 — Fundacion y Seguridad | Complete |
| LAND-01 | Phase 2 — Landing Publica | Complete |
| LAND-02 | Phase 2 — Landing Publica | Complete |
| LAND-03 | Phase 2 — Landing Publica | Complete |
| LAND-04 | Phase 2 — Landing Publica | Complete |
| LAND-05 | Phase 2 — Landing Publica | Complete |
| TICK-01 | Phase 3 — Boleteria y Acceso | Complete |
| TICK-02 | Phase 3 — Boleteria y Acceso | Complete |
| TICK-03 | Phase 3 — Boleteria y Acceso | Complete |
| TICK-04 | Phase 3 — Boleteria y Acceso | Complete |
| TICK-05 | Phase 3 — Boleteria y Acceso | Complete |
| TICK-06 | Phase 3 — Boleteria y Acceso | Complete |
| TICK-07 | Phase 3 — Boleteria y Acceso | Complete |
| MESA-01 | Phase 4 — Mesas y Meseros | Complete |
| MESA-02 | Phase 4 — Mesas y Meseros | Complete |
| MESA-03 | Phase 4 — Mesas y Meseros | Complete |
| MESA-04 | Phase 4 — Mesas y Meseros | Complete |
| INV-01 | Phase 5 — Inventario y Dashboard | Complete |
| INV-02 | Phase 5 — Inventario y Dashboard | Complete |
| INV-03 | Phase 5 — Inventario y Dashboard | Complete |
| INV-04 | Phase 5 — Inventario y Dashboard | Complete |
| INV-05 | Phase 5 — Inventario y Dashboard | Complete |
| INV-06 | Phase 5 — Inventario y Dashboard | Complete |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0

---
*Requirements defined: 2026-05-14*
*Last updated: 2026-05-14 — traceability expanded to individual requirements after roadmap creation*
