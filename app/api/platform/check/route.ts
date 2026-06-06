import { NextResponse } from 'next/server'
import {
  isPlatformOwner,
} from '@/lib/platform-owner'
import { requireAuth } from '@/lib/require-auth'

export async function GET() {
  const { user } = await requireAuth()
  if (!user) {
    return NextResponse.json({ owner: false }, { status: 401 })
  }

  return NextResponse.json({
    owner: isPlatformOwner(user.email),
  })
}
