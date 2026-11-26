export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const leads = await prisma.lead.findMany({
    include: {
      tag: true,
      conversations: {
        select: { lastMsg: true, unread: true },
        take: 1,
        orderBy: { lastMsgAt: 'desc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(leads)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const lead = await prisma.lead.create({
    data: {
      name: body.name,
      phone: body.phone,
      email: body.email,
      stage: body.stage ?? 'novo_lead',
      origin: body.origin ?? 'whatsapp',
    },
  })
  return NextResponse.json(lead, { status: 201 })
}
