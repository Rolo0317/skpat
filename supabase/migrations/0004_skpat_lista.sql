-- Lista de invitados: tipo de entrada gratuito con QR propio, uno por correo y evento.
-- Idempotente: se puede volver a aplicar sin efecto.
alter table skpat.tickets drop constraint if exists tickets_ticket_type_check;
alter table skpat.tickets add constraint tickets_ticket_type_check
  check (ticket_type in ('general','lista','palco_silver','palco_gold','palco_platinum'));

create unique index if not exists tickets_lista_unica
  on skpat.tickets (event_id, email) where ticket_type = 'lista';
