import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { SmoothScroll } from '@/components/smooth-scroll'
import { SITE_LOGO } from '@/lib/branding'
import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Unidos por el IES | Tu Identidad, Tu Institución, Tu Voz',
  description:
    'Construyendo un espacio seguro para todos los estudiantes. Nosotros te escuchamos, nosotros te defendemos.',
  keywords: ['centro de estudiantes', 'IES', 'unidos', 'argentina', 'institución', 'estudiantes'],
  authors: [{ name: 'Unidos por el IES' }],
  icons: {
    icon: SITE_LOGO,
    apple: SITE_LOGO,
  },
  openGraph: {
    title: 'Unidos por el IES | Tu Identidad, Tu Institución, Tu Voz',
    description: 'Construyendo un espacio seguro para todos los estudiantes.',
    type: 'website',
    locale: 'es_AR',
  },
}

export const viewport: Viewport = {
  themeColor: '#0077CC',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${spaceGrotesk.variable} bg-background`}>
      <body className="font-sans antialiased overflow-x-hidden">
        <SmoothScroll />
        {children}
      </body>
    </html>
  )
}
