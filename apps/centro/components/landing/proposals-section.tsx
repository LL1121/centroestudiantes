'use client'

import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useRef, useState } from 'react'
import { Heart, BookOpen, BarChart3 } from 'lucide-react'

const proposals = [
  {
    icon: Heart,
    title: 'Taller: Nuestra Resiliencia',
    subtitle: 'Salud Mental',
    description: 'Acompañamiento profesional y par a par.',
    color: 'celeste',
    gradient: 'from-celeste to-primary',
  },
  {
    icon: BookOpen,
    title: 'Biblioteca Digital',
    subtitle: 'Wiki-IES',
    description: 'Acceso libre a apuntes y recursos.',
    color: 'gold',
    gradient: 'from-gold to-gold-light',
  },
  {
    icon: BarChart3,
    title: 'Tablero de Cuentas Claras',
    subtitle: 'Transparencia',
    description: 'Transparencia en tiempo real de los fondos del CE.',
    color: 'primary',
    gradient: 'from-primary to-navy',
  },
]

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 })
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 })

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"])
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    
    const rect = ref.current.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    const xPct = mouseX / width - 0.5
    const yPct = mouseY / height - 0.5
    
    x.set(xPct)
    y.set(yPct)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={`relative ${className}`}
    >
      <div
        style={{
          transform: "translateZ(75px)",
          transformStyle: "preserve-3d",
        }}
        className="h-full"
      >
        {children}
      </div>
      
      {/* Glow effect */}
      <motion.div
        animate={{ opacity: isHovered ? 1 : 0 }}
        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gold/20 to-transparent blur-xl -z-10"
      />
    </motion.div>
  )
}

function AnimatedBarChart() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })
  
  const bars = [
    { height: 60, label: 'Ene' },
    { height: 80, label: 'Feb' },
    { height: 45, label: 'Mar' },
    { height: 90, label: 'Abr' },
    { height: 70, label: 'May' },
  ]

  return (
    <div ref={ref} className="flex items-end justify-center gap-2 h-24 mt-4">
      {bars.map((bar, i) => (
        <div key={i} className="flex flex-col items-center">
          <motion.div
            initial={{ height: 0 }}
            animate={isInView ? { height: bar.height } : {}}
            transition={{ delay: i * 0.1 + 0.5, duration: 0.5, ease: "easeOut" }}
            className="w-6 bg-gradient-to-t from-primary to-celeste rounded-t-sm"
          />
          <span className="text-[10px] text-muted-foreground mt-1">{bar.label}</span>
        </div>
      ))}
    </div>
  )
}

function WikiMockup() {
  const [isTyping, setIsTyping] = useState(false)
  
  return (
    <div className="mt-4 p-3 bg-white/50 rounded-lg border border-border">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <div className="w-2 h-2 rounded-full bg-yellow-400" />
          <div className="w-2 h-2 rounded-full bg-green-400" />
        </div>
        <span className="text-[10px] text-muted-foreground">wiki-ies.edu.ar</span>
      </div>
      <motion.div
        onHoverStart={() => setIsTyping(true)}
        onHoverEnd={() => setIsTyping(false)}
        className="relative"
      >
        <input
          type="text"
          placeholder="Buscar apuntes..."
          readOnly
          className="w-full px-3 py-1.5 text-xs bg-white rounded border border-border focus:outline-none"
        />
        <motion.div
          animate={{ opacity: isTyping ? 1 : 0 }}
          className="absolute right-2 top-1/2 -translate-y-1/2"
        >
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="text-xs text-primary"
          >
            |
          </motion.span>
        </motion.div>
      </motion.div>
      <div className="mt-2 space-y-1">
        {['Matemática I', 'Historia Argentina', 'Introducción al Derecho'].map((item, i) => (
          <motion.div
            key={item}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="text-[10px] text-muted-foreground px-2 py-1 rounded bg-secondary/50 truncate"
          >
            📚 {item}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export function ProposalsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  return (
    <section 
      ref={sectionRef} 
      id="propuestas"
      className="relative overflow-hidden bg-gradient-to-b from-white to-secondary/30 py-16 sm:py-24 md:py-32"
    >
      {/* Background decoration */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-celeste/10 rounded-full blur-3xl -translate-x-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-gold/10 rounded-full blur-3xl translate-x-1/3" />

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
            className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4"
          >
            Propuestas
          </motion.span>
          <h2 className="font-serif text-3xl font-bold text-balance text-navy sm:text-4xl md:text-5xl">
            Un plan de acción para ustedes
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Herramientas concretas para mejorar tu experiencia
          </p>
        </motion.div>

        {/* Proposal Cards with Tilt Effect */}
        <div className="perspective-1000 mx-auto grid max-w-md grid-cols-1 gap-6 sm:max-w-none md:grid-cols-3 md:gap-8">
          {proposals.map((proposal, index) => (
            <motion.div
              key={proposal.title}
              initial={{ opacity: 0, y: 60 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.2, duration: 0.6 }}
            >
              <TiltCard className="h-full">
                <div className="h-full p-6 rounded-2xl bg-white border border-border shadow-lg hover:shadow-xl transition-shadow duration-300">
                  {/* Icon with gradient background */}
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${proposal.gradient} mb-4`}>
                    <proposal.icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Badge */}
                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full mb-3 ${
                    proposal.color === 'celeste' ? 'bg-celeste/20 text-primary' :
                    proposal.color === 'gold' ? 'bg-gold/20 text-gold' :
                    'bg-primary/20 text-primary'
                  }`}>
                    {proposal.subtitle}
                  </span>

                  {/* Content */}
                  <h3 className="font-serif text-lg font-bold text-navy mb-2">
                    {proposal.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {proposal.description}
                  </p>

                  {/* Interactive Elements */}
                  {proposal.subtitle === 'Transparencia' && <AnimatedBarChart />}
                  {proposal.subtitle === 'Wiki-IES' && <WikiMockup />}
                  {proposal.subtitle === 'Salud Mental' && (
                    <div className="mt-4 p-3 bg-celeste/10 rounded-lg">
                      <div className="flex items-center gap-3">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-celeste to-primary flex items-center justify-center"
                        >
                          <Heart className="w-5 h-5 text-white" />
                        </motion.div>
                        <div className="text-xs text-muted-foreground">
                          <p className="font-medium text-navy">Apoyo 24/7</p>
                          <p>Siempre hay alguien para vos</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
