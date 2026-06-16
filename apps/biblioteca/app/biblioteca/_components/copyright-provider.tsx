'use client'

import { createContext, useContext, type ReactNode } from 'react'

const CopyrightContext = createContext(false)

export function CopyrightProvider({
  enabled,
  children,
}: {
  enabled: boolean
  children: ReactNode
}) {
  return <CopyrightContext.Provider value={enabled}>{children}</CopyrightContext.Provider>
}

export function useCopyrightEnabled(): boolean {
  return useContext(CopyrightContext)
}
