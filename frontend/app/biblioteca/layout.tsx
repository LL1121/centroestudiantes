import type { ReactNode } from 'react'

export default function BibliotecaLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-secondary/30">{children}</div>
}
