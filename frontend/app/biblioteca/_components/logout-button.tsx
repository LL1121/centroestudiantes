'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export function LogoutButton() {
  const router = useRouter()
  const [pending, start] = useTransition()

  const onClick = () => {
    start(async () => {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.replace('/biblioteca/login')
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-white px-3 py-2 text-xs font-medium text-navy transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50 sm:self-auto"
    >
      <LogOut className="h-4 w-4" aria-hidden />
      Cerrar sesión
    </button>
  )
}
