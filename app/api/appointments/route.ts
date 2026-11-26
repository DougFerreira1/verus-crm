export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const where: any = {}
  if (from) where.date = { ...(where.date ?? {}), gte: new Date(from) }
  if (to) where.date = { ...(where.date ?? {}), lte: new Date(to) }

  const appointments = await prisma.appointment.findMany({
    where,
    include: { lead: { select: { name: true, phone: true } } },
    orderBy: { date: 'asc' },
  })
  return NextResponse.json(appointments)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const appointment = await prisma.appointment.create({
    data: {
      leadId: body.leadId,
      date: new Date(body.date),
      duration: body.duration ?? 60,
      title: body.title ?? 'Reunião',
      description: body.description,
      synced: false,
    },
  })

  // Move lead to 'agendado'
  await prisma.lead.update({
    where: { id: body.leadId },
    data: { stage: 'agendado', autoMoved: true },
  })

  return NextResponse.json(appointment, { status: 201 })
}
