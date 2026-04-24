import { Hero } from '@/components/landing/hero'
import { MissionSection } from '@/components/landing/mission-section'
import { ProposalsSection } from '@/components/landing/proposals-section'
import { DenunciaSection } from '@/components/landing/denuncia-section'
import { Footer } from '@/components/landing/footer'

export default function HomePage() {
  return (
    <main className="min-h-screen w-full max-w-[100vw] overflow-x-hidden mx-auto">
      <Hero />
      <MissionSection />
      <ProposalsSection />
      <DenunciaSection />
      <Footer />
    </main>
  )
}
