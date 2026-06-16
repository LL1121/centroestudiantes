'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

function VerifyInner() {
  const params = useSearchParams()
  const token = params.get('token')
  const [message, setMessage] = useState('Verificando tu email…')

  useEffect(() => {
    if (!token) {
      setMessage('Enlace inválido.')
      return
    }
    fetch('/api/auth/verify-email/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { detail?: string }
          setMessage(body.detail ?? 'No pudimos verificar el email.')
          return
        }
        setMessage('¡Email verificado! Ya podés usar la biblioteca con tu cuenta.')
      })
      .catch(() => setMessage('Error de conexión.'))
  }, [token])

  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-4">
      <p className="text-center text-sm text-navy">{message}</p>
    </main>
  )
}

export default function VerificarEmailPage() {
  return (
    <Suspense>
      <VerifyInner />
    </Suspense>
  )
}
