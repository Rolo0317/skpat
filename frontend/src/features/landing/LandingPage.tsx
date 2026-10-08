import { Navbar } from './Navbar'
import { HeroSection } from './HeroSection'
import { EventsSection } from './EventsSection'
import { VipSection } from './VipSection'
import { MapSection } from './MapSection'
import { AiChatWidget } from './AiChatWidget'

export default function LandingPage() {
  return (
    <div className="bg-skpat-bg text-skpat-text min-h-screen">
      <Navbar />
      <main className="pt-14">
        <HeroSection />
        <EventsSection />
        <VipSection />
        <MapSection />
        <footer className="text-center py-10 px-6 border-t border-skpat-border text-[#475569] text-[13px]">
          <div className="text-2xl font-black text-skpat-oro mb-2">SKPAT VIP</div>
          © 2025 Skpat VIP · Todos los derechos reservados · Bogotá, Colombia
        </footer>
      </main>
      <AiChatWidget />
    </div>
  )
}
