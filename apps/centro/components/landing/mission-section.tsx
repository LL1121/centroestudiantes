'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Shield, Users, Eye } from 'lucide-react'

const pillars = [
  {
    icon: Shield,
    title: 'Seguridad y Confianza',
    description: 'Un espacio donde podés expresarte sin miedo. Somos tu voz ante la directiva.',
    gradient: 'from-primary/10 to-celeste/10',
  },
  {
    icon: Users,
    title: 'Unidad y Pertenencia',
    description: 'Porque todos somos el IES. Defendemos nuestra identidad con orgullo.',
    gradient: 'from-gold/10 to-gold-light/20',
  },
  {
    icon: Eye,
    title: 'Transparencia',
    description: 'Gestión clara y digital. Sabrás en qué se usa cada recurso del Centro.',
    gradient: 'from-celeste/10 to-primary/10',
  },
]

const cardVariants = {
  hidden: { opacity: 0, y: 60, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.2,
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
}

export function MissionSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  return (
    <section
      id="mision"
      ref={sectionRef}
      className="relative overflow-hidden bg-white py-16 sm:py-24 md:py-32"
    >
      {/* Subtle background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-radial from-celeste/5 to-transparent rounded-full blur-3xl" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center sm:mb-16 md:mb-20"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-block px-4 py-1.5 bg-gold/10 text-gold rounded-full text-sm font-medium mb-4"
          >
            Nuestros Valores
          </motion.span>
          <h2 className="font-serif text-3xl font-bold text-balance text-navy sm:text-4xl md:text-5xl">
            Nuestro Centro
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Tres pilares fundamentales que guían cada una de nuestras acciones
          </p>
        </motion.div>

        {/* Pillar Cards */}
        <div className="mx-auto grid max-w-md grid-cols-1 gap-5 sm:max-w-none md:grid-cols-3 md:gap-6 lg:gap-8">
          {pillars.map((pillar, index) => (
            <motion.div
              key={pillar.title}
              custom={index}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              variants={cardVariants}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              className="group relative"
            >
              <div className={`
                relative h-full rounded-2xl bg-gradient-to-br p-6 sm:p-8 ${pillar.gradient}
                border border-transparent transition-all duration-500
                hover:border-gold/30 hover:shadow-xl hover:shadow-gold/10
              `}>
                {/* Icon */}
                <div className="mb-6">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-white shadow-lg shadow-primary/10"
                  >
                    <pillar.icon className="w-7 h-7 text-primary" />
                  </motion.div>
                </div>

                {/* Content */}
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-navy mb-3">
                  {pillar.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {pillar.description}
                </p>

                {/* Decorative corner */}
                <div className="absolute bottom-0 right-0 w-24 h-24 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-gold/40 rounded-br-xl" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
