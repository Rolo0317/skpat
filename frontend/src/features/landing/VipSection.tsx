interface PalcoTier {
  icon: string
  name: string
  desc: string
  price: string
  borderColor: string
  priceColor: string
  popular?: boolean
  ctaGradient?: string
}

const TIERS: PalcoTier[] = [
  {
    icon: '🥂',
    name: 'Palco Silver',
    desc: 'Hasta 6 personas · 2 botellas incluidas',
    price: '$450.000',
    borderColor: '#f59e0b',
    priceColor: '#f59e0b',
  },
  {
    icon: '💎',
    name: 'Palco Gold',
    desc: 'Hasta 10 personas · 4 botellas + servicio',
    price: '$850.000',
    borderColor: '#8b5cf6',
    priceColor: '#8b5cf6',
    popular: true,
  },
  {
    icon: '👑',
    name: 'Palco Platinum',
    desc: 'Hasta 15 personas · Abierto + servicio dedicado',
    price: '$1.500.000',
    borderColor: '#ec4899',
    priceColor: '#ec4899',
    ctaGradient: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
  },
]

export function VipSection() {
  return (
    <section
      id="palcos"
      className="border-y border-skpat-border py-16 px-6"
      style={{ background: 'linear-gradient(135deg, #0f0a1e, #1a0f33)' }}
    >
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-10">
          <div
            className="text-skpat-gold text-xs uppercase font-bold"
            style={{ letterSpacing: '3px' }}
          >
            Experiencia Premium
          </div>
          <h2 className="text-white text-[32px] font-black mt-2">
            Palcos <span className="text-skpat-gold">VIP</span>
          </h2>
          <p className="text-skpat-muted mt-2">
            Reserva tu palco y vive la noche sin límites
          </p>
        </div>
        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}
        >
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className="bg-skpat-card rounded-2xl p-6 relative"
              style={{ border: `2px solid ${tier.borderColor}` }}
            >
              {tier.popular && (
                <div
                  className="absolute text-white text-[10px] font-bold px-3 py-1 rounded-full"
                  style={{
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                    letterSpacing: '1px',
                  }}
                >
                  MÁS POPULAR
                </div>
              )}
              <div className="text-[28px] mb-3">{tier.icon}</div>
              <div className="text-white text-lg font-extrabold">{tier.name}</div>
              <div className="text-skpat-muted text-[13px] my-2 mb-4">{tier.desc}</div>
              <div
                className="text-[26px] font-black"
                style={{ color: tier.priceColor }}
              >
                {tier.price}
              </div>
              <a
                href="/login"
                className="block text-center w-full mt-4 py-3.5 rounded-full text-white font-bold text-[15px]"
                style={{
                  background:
                    tier.ctaGradient ?? 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  boxShadow: '0 4px 20px #8b5cf640',
                }}
              >
                Reservar
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
