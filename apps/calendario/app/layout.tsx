import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { SITE_LOGO, SITE_NAME } from '@/lib/branding'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: `Calendario · ${SITE_NAME}`,
  description:
    'Feriados nacionales, provinciales y fechas importantes del IES N° 9018 de Malargüe.',
  keywords: ['calendario', 'feriados', 'IES', 'Malargüe', 'centro de estudiantes'],
  authors: [{ name: SITE_NAME }],
  icons: {
    icon: SITE_LOGO,
    apple: SITE_LOGO,
  },
  openGraph: {
    title: `Calendario · ${SITE_NAME}`,
    description: 'Feriados y fechas importantes del IES N° 9018.',
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
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground min-h-screen">
        {children}
      </body>
    </html>
  )
}
