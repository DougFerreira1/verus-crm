export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const conversations = await prisma.conversation.findMany({
    include: {
      lead: { select: { id: true, name: true, phone: true, aiHandled: true, stage: true } },
    },
    orderBy: { lastMsgAt: 'desc' },
  })
  return NextResponse.json(conversations)
}
