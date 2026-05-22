import { DenunciaSection } from '@/components/landing/denuncia-section'
import { Footer } from '@/components/landing/footer'
import { Header } from '@/components/landing/header'
import { Hero } from '@/components/landing/hero'
import { MissionSection } from '@/components/landing/mission-section'
import { ProposalsSection } from '@/components/landing/proposals-section'

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="mx-auto min-h-screen w-full max-w-[100vw] overflow-x-hidden">
        <Hero />
        <MissionSection />
        <ProposalsSection />
        <DenunciaSection />
        <Footer />
      </main>
    </>
  )
}
