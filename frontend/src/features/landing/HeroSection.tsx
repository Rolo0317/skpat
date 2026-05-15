export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden px-6">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 20%, #8b5cf620 0%, transparent 70%),
            radial-gradient(ellipse 60% 40% at 80% 80%, #ec489915 0%, transparent 60%),
            radial-gradient(ellipse 40% 30% at 10% 90%, #06b6d410 0%, transparent 50%)
          `,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(#2a2a4a 1px, transparent 1px), linear-gradient(90deg, #2a2a4a 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      <h1
        className="gradient-text text-glow relative font-black leading-none"
        style={{ fontSize: 'clamp(56px, 10vw, 120px)', letterSpacing: '-2px' }}
      >
        SKPAT
      </h1>
      <p
        className="relative text-skpat-purple uppercase mt-2"
        style={{ letterSpacing: '12px', fontSize: 'clamp(14px, 2.5vw, 22px)' }}
      >
        V I P
      </p>
      <p
        className="relative text-skpat-muted mt-6 max-w-[480px] leading-relaxed"
        style={{ fontSize: 'clamp(14px, 2vw, 18px)' }}
      >
        La experiencia definitiva de música electrónica y guaracha en Colombia. Noches que no
        olvidarás.
      </p>
      <div className="relative flex gap-4 mt-10 flex-wrap justify-center">
        <a
          href="/login"
          className="px-8 py-3.5 rounded-full text-white font-bold text-[15px] tracking-wide transition-all hover:-translate-y-0.5"
          style={{
            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            boxShadow: '0 4px 20px #8b5cf640',
          }}
        >
          🎫 Comprar tiquetes
        </a>
        <a
          href="#eventos"
          className="px-8 py-3.5 rounded-full border border-skpat-purple text-skpat-purple bg-transparent font-semibold text-[15px] transition-all hover:-translate-y-0.5 hover:bg-[#8b5cf610]"
        >
          📅 Ver eventos
        </a>
      </div>
      <div className="relative flex gap-12 mt-16 flex-wrap justify-center">
        <div className="text-center">
          <div className="gradient-stat font-black text-[32px]">5K+</div>
          <div className="text-skpat-muted text-xs uppercase" style={{ letterSpacing: '2px' }}>
            Asistentes / mes
          </div>
        </div>
        <div className="text-center">
          <div className="gradient-stat font-black text-[32px]">48</div>
          <div className="text-skpat-muted text-xs uppercase" style={{ letterSpacing: '2px' }}>
            Eventos realizados
          </div>
        </div>
        <div className="text-center">
          <div className="gradient-stat font-black text-[32px]">12</div>
          <div className="text-skpat-muted text-xs uppercase" style={{ letterSpacing: '2px' }}>
            DJs residentes
          </div>
        </div>
      </div>
      <div
        className="absolute bottom-8 left-1/2 flex flex-col items-center gap-2 text-skpat-muted text-xs"
        style={{ animation: 'bounce-scroll 2s infinite', transform: 'translateX(-50%)' }}
      >
        <span>▼</span>
        <span>Próximos eventos</span>
      </div>
    </section>
  )
}
