import 'server-only'

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGO = 'aes-256-gcm'

function keyBytes() {
  const secret = process.env.PENDING_SIGNUP_SECRET
  if (!secret || secret.length < 16) {
    throw new Error(
      'PENDING_SIGNUP_SECRET must be set (16+ chars) for paid admin signup.'
    )
  }
  return scryptSync(secret, 'ledgerstack-pending-signup', 32)
}

export function encryptSignupPassword(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, keyBytes(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

export function decryptSignupPassword(payload: string): string {
  const buf = Buffer.from(payload, 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const data = buf.subarray(28)
  const decipher = createDecipheriv(ALGO, keyBytes(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    'utf8'
  )
}
