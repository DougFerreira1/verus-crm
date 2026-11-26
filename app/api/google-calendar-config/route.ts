export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  let config = await prisma.googleCalendarConfig.findFirst({ orderBy: { updatedAt: 'desc' } })
  if (!config) {
    config = await prisma.googleCalendarConfig.create({ data: {} })
  }
  return NextResponse.json(config)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  let config = await prisma.googleCalendarConfig.findFirst({ orderBy: { updatedAt: 'desc' } })

  if (config) {
    config = await prisma.googleCalendarConfig.update({
      where: { id: config.id },
      data: { calendarId: body.calendarId ?? config.calendarId },
    })
  } else {
    config = await prisma.googleCalendarConfig.create({
      data: { calendarId: body.calendarId ?? 'primary' },
    })
  }

  return NextResponse.json(config)
}
