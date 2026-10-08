const MAPS_EMBED = import.meta.env.VITE_MAPS_EMBED_URL ??
  'https://www.google.com/maps?q=Carrera+15+%2393-47,+Bogotá&output=embed'

export function MapSection() {
  return (
    <section className="bg-skpat-bg2 border-y border-skpat-border py-16 px-6">
      <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="rounded-2xl overflow-hidden border border-skpat-border h-72">
          <iframe
            src={MAPS_EMBED}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Ubicación Skpat VIP"
          />
        </div>
        <div>
          <h3 className="text-[#faf7f0] text-[26px] font-extrabold mb-3">¿Cómo llegar?</h3>
          <div className="flex gap-3 items-start mb-4">
            <span className="text-lg mt-0.5">📍</span>
            <p className="text-sm text-skpat-muted leading-relaxed">
              Cra. 15 #93-47, Bogotá, Colombia<br />
              <span className="text-skpat-oro">Nueva ubicación 2025</span>
            </p>
          </div>
          <div className="flex gap-3 items-start mb-4">
            <span className="text-lg mt-0.5">🕘</span>
            <p className="text-sm text-skpat-muted leading-relaxed">
              Viernes y Sábados: 9:00 PM – 4:00 AM<br />
              Domingos especiales: 8:00 PM – 2:00 AM
            </p>
          </div>
          <div className="flex gap-3 items-start mb-4">
            <span className="text-lg mt-0.5">📞</span>
            <p className="text-sm text-skpat-muted leading-relaxed">
              +57 300 000 0000<br />
              @skpat.vip
            </p>
          </div>
          <a
            href="https://maps.google.com/?q=Carrera+15+93-47+Bogotá"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-3 rounded-full text-skpat-bg font-bold text-[15px]"
            style={{
              background: 'linear-gradient(135deg, #d4a63a, #f2d38a)',
              boxShadow: '0 4px 20px #d4a63a40',
            }}
          >
            Ver en Google Maps
          </a>
        </div>
      </div>
    </section>
  )
}
