'use client'

import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useRef, useState } from 'react'
import { Lock, Shield, Send } from 'lucide-react'

export function DenunciaSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })
  const [isFocused, setIsFocused] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const handleFocus = () => {
    setIsFocused(true)
    setTimeout(() => setIsLocked(true), 500)
  }

  const handleBlur = () => {
    if (!inputValue) {
      setIsFocused(false)
      setIsLocked(false)
    }
  }

  return (
    <section 
      ref={sectionRef}
      className="relative overflow-hidden py-16 sm:py-24 md:py-32"
    >
      {/* Blue gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-celeste/20 via-primary/10 to-celeste-light/20" />
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-gold/10 rounded-full blur-2xl" />
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/30 rounded-full blur-3xl" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Glassmorphism Card */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="glass rounded-3xl p-6 text-center sm:p-10 md:p-12 lg:p-16"
        >
          {/* Shield Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={isInView ? { scale: 1 } : {}}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-navy shadow-xl shadow-primary/20 mb-8"
          >
            <Shield className="w-10 h-10 text-white" />
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4 }}
            className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-navy mb-6 text-balance"
          >
            Tu Voz Está Protegida
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.5 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed"
          >
            El Centro de Estudiantes es un espacio de confianza: recibimos tu reclamo con respeto y
            confidencialidad, lo elevamos por los canales que corresponden y{' '}
            <span className="font-semibold text-navy">tu identidad queda protegida en todo momento</span>.
          </motion.p>

          {/* Feature badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap justify-center gap-3 mb-10"
          >
            {['100% Anónimo', 'Confidencial', 'Mediado por el CE'].map((badge, i) => (
              <span
                key={badge}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/80 rounded-full text-sm font-medium text-navy shadow-sm"
              >
                <Lock className="w-3.5 h-3.5 text-gold" />
                {badge}
              </span>
            ))}
          </motion.div>

          {/* Interactive Form Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.7 }}
            className="max-w-xl mx-auto"
          >
            <div className="relative">
              {/* Input field */}
              <motion.div
                animate={{
                  boxShadow: isFocused 
                    ? '0 0 0 3px rgba(198, 161, 101, 0.3), 0 0 30px rgba(198, 161, 101, 0.2)' 
                    : '0 0 0 0px rgba(198, 161, 101, 0)',
                }}
                transition={{ duration: 0.3 }}
                className="relative"
              >
                <input
                  type="text"
                  placeholder="Ingresá tu queja de forma segura..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  className="w-full px-6 py-4 pr-14 bg-white rounded-2xl border-2 border-border focus:border-gold focus:outline-none text-navy placeholder:text-muted-foreground transition-all duration-300"
                />
                
                {/* Lock animation */}
                <AnimatePresence>
                  {isFocused && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                    >
                      <motion.div
                        animate={isLocked ? { y: [0, -3, 0] } : {}}
                        transition={{ duration: 0.3 }}
                        className="relative"
                      >
                        <Lock className={`w-6 h-6 transition-colors duration-300 ${isLocked ? 'text-gold' : 'text-muted-foreground'}`} />
                        {isLocked && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
                          />
                        )}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Submit hint */}
              <AnimatePresence>
                {inputValue && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute -bottom-8 left-0 right-0 text-center"
                  >
                    <span className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Send className="w-3 h-3" />
                      Tu mensaje será encriptado y anónimo
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.9 }}
            className="mt-16 pt-8 border-t border-border/50"
          >
            <p className="text-sm text-muted-foreground">
              Guardianes de tu voz desde el primer día
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
