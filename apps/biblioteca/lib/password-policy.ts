import { z } from 'zod'

const COMMON = new Set([
  'password',
  'password1',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty123',
  'admin123',
  'biblioteca',
  'centro123',
])

export function passwordStrengthMessage(password: string): string | null {
  if (password.length < 10) return 'Mínimo 10 caracteres.'
  if (password.length > 128) return 'Máximo 128 caracteres.'
  if (!/[a-z]/.test(password)) return 'Incluí una minúscula.'
  if (!/[A-Z]/.test(password)) return 'Incluí una mayúscula.'
  if (!/\d/.test(password)) return 'Incluí un número.'
  if (COMMON.has(password.toLowerCase())) return 'Contraseña demasiado común.'
  return null
}

export const registerPasswordSchema = z
  .string()
  .min(10, 'Mínimo 10 caracteres')
  .max(128)
  .refine((p) => /[a-z]/.test(p), 'Incluí una minúscula')
  .refine((p) => /[A-Z]/.test(p), 'Incluí una mayúscula')
  .refine((p) => /\d/.test(p), 'Incluí un número')
  .refine((p) => !COMMON.has(p.toLowerCase()), 'Contraseña demasiado común')

export function passwordScore(password: string): number {
  let score = 0
  if (password.length >= 10) score += 1
  if (password.length >= 14) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  if (COMMON.has(password.toLowerCase())) score = 0
  return Math.min(score, 4)
}
