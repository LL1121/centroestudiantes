'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import Image from 'next/image'
import { SITE_LOGO } from '@/lib/branding'
import { ArrowRight, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Footer() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    
    setStatus('loading')
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    setStatus('success')
    setEmail('')
    
    setTimeout(() => setStatus('idle'), 3000)
  }

  return (
    <footer ref={sectionRef} className="relative overflow-hidden">
      {/* CTA Section */}
      <section className="relative bg-gradient-to-br from-primary via-navy to-primary py-16 sm:py-24 md:py-32">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-10 left-10 w-64 h-64 bg-gold/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-celeste/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        </div>

        {/* Pattern overlay */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FFFFFF' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          {/* Main CTA content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-6 font-serif text-3xl font-bold text-balance text-white sm:text-4xl md:text-5xl lg:text-6xl">
              Sumate a cambiar el IES.
            </h2>
            <p className="mb-4 text-lg text-white/80 sm:text-xl md:text-2xl">
              Esta es tu casa. Esta es tu lista.
            </p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.3 }}
              className="text-gold font-medium text-lg mb-10"
            >
              Dejanos tu email y sé parte del cambio
            </motion.p>
          </motion.div>

          {/* Email form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4, duration: 0.6 }}
            onSubmit={handleSubmit}
            className="max-w-md mx-auto"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === 'loading' || status === 'success'}
                  className="w-full px-5 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:border-gold transition-all duration-300 disabled:opacity-50"
                />
              </div>
              <Button
                type="submit"
                disabled={!email || status === 'loading' || status === 'success'}
                className="group relative overflow-hidden bg-gold hover:bg-gold-light text-navy font-semibold px-6 py-4 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-gold/30 disabled:opacity-50 disabled:hover:scale-100"
              >
                {status === 'idle' && (
                  <>
                    <span>Sumarme</span>
                    <ArrowRight className="w-4 h-4 ml-2 inline-block group-hover:translate-x-1 transition-transform" />
                  </>
                )}
                {status === 'loading' && (
                  <Loader2 className="w-5 h-5 animate-spin" />
                )}
                {status === 'success' && (
                  <>
                    <Check className="w-5 h-5 mr-1" />
                    <span>¡Listo!</span>
                  </>
                )}
              </Button>
            </div>
            
            {status === 'success' && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 text-sm text-gold"
              >
                ¡Gracias por sumarte! Te mantendremos informado.
              </motion.p>
            )}
          </motion.form>
        </div>
      </section>

      {/* Footer bar */}
      <div className="bg-navy py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Logo and name */}
            <div className="flex items-center gap-3">
              <Image
                src={SITE_LOGO}
                alt="Unidos por el IES"
                width={40}
                height={40}
                className="rounded-full"
              />
              <span className="text-white font-medium">Unidos por el IES</span>
            </div>

            {/* Coming soon text */}
            <p className="text-sm text-white/60">Unidos por el IES · 2026</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
