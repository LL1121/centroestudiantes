'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { ChevronDown } from 'lucide-react'
import { SITE_LOGO } from '@/lib/branding'

const wordVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 1 + i * 0.1,
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
}

export function Hero() {
  const titleWords = ['UNIDOS', 'POR', 'EL', 'IES:']
  const subtitleWords = ['TU', 'IDENTIDAD,', 'TU', 'INSTITUCIÓN,', 'TU', 'VOZ.']

  const scrollToMission = () => {
    document.getElementById('mision')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      id="inicio"
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden"
    >
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-celeste-light/30 via-white to-white" />

      {/* Subtle Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230077CC' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center px-4 pt-16 pb-8 sm:max-w-none sm:px-6 sm:pt-20 sm:pb-10 lg:px-8">
        {/* Logo with reveal animation and gold glow */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 0.8,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="relative mb-8 sm:mb-10"
        >
          {/* Gold glow effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0] }}
            transition={{
              duration: 2,
              delay: 0.5,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 scale-150 rounded-full bg-gold/30 blur-3xl"
          />

          <motion.div
            initial={{ boxShadow: '0 0 0 rgba(198, 161, 101, 0)' }}
            animate={{
              boxShadow: [
                '0 0 0 rgba(198, 161, 101, 0)',
                '0 0 60px rgba(198, 161, 101, 0.5)',
                '0 0 30px rgba(198, 161, 101, 0.2)',
              ],
            }}
            transition={{ duration: 1.5, delay: 0.3 }}
            className="relative rounded-full"
          >
            <Image
              src={SITE_LOGO}
              alt="Unidos por el IES"
              width={180}
              height={180}
              sizes="(max-width: 640px) 140px, 180px"
              className="h-[140px] w-[140px] rounded-full shadow-2xl sm:h-[180px] sm:w-[180px]"
              priority
            />
          </motion.div>
        </motion.div>

        {/* Main Title - Word by word animation */}
        <div className="mb-5 text-center sm:mb-6">
          <h1 className="font-serif text-[clamp(1.5rem,6vw,4.5rem)] font-bold tracking-tight text-navy sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="flex flex-wrap justify-center gap-x-2 sm:gap-x-4">
              {titleWords.map((word, i) => (
                <motion.span
                  key={i}
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  variants={wordVariants}
                  className="inline-block"
                >
                  {word}
                </motion.span>
              ))}
            </span>
            <span className="mt-2 flex flex-wrap justify-center gap-x-1.5 sm:gap-x-3">
              {subtitleWords.map((word, i) => (
                <motion.span
                  key={i}
                  custom={i + titleWords.length}
                  initial="hidden"
                  animate="visible"
                  variants={wordVariants}
                  className={`inline-block ${
                    word.includes('IDENTIDAD') ||
                    word.includes('INSTITUCIÓN') ||
                    word.includes('VOZ')
                      ? 'text-primary'
                      : ''
                  }`}
                >
                  {word}
                </motion.span>
              ))}
            </span>
          </h1>
        </div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2, duration: 0.6 }}
          className="mb-10 max-w-xl text-pretty text-center font-sans text-base leading-relaxed text-muted-foreground sm:mb-12 sm:max-w-3xl sm:text-lg md:text-xl"
        >
          Construyendo un espacio seguro para todos los estudiantes.{' '}
          <span className="font-medium text-primary">
            Nosotros te escuchamos, nosotros te defendemos.
          </span>
        </motion.p>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.6, duration: 0.6 }}
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 sm:bottom-8"
      >
        <button
          type="button"
          onClick={scrollToMission}
          className="flex flex-col items-center text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="flex flex-col items-center"
          >
            <span className="mb-2 text-sm font-medium">Descubrí más</span>
            <ChevronDown className="h-6 w-6" aria-hidden />
          </motion.div>
        </button>
      </motion.div>
    </section>
  )
}
