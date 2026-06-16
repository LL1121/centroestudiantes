'use client'

import { Toaster as Sonner, type ToasterProps } from 'sonner'

import { useBibliotecaTheme } from './biblioteca-theme-provider'

export function BibliotecaToaster(props: ToasterProps) {
  const { theme } = useBibliotecaTheme()

  return (
    <Sonner
      theme={theme}
      richColors
      position="top-right"
      closeButton
      {...props}
    />
  )
}
