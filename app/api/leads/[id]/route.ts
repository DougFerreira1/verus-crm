export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await params
  const lead = await prisma.lead.findUnique({ where: { id }, include: { conversations: true, appointments: true } })
  if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
  return NextResponse.json(lead)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await params
  const body = await request.json()
  const data: any = {}
  if (body.stage !== undefined) data.stage = body.stage
  if (body.autoMoved !== undefined) data.autoMoved = body.autoMoved
  if (body.aiHandled !== undefined) data.aiHandled = body.aiHandled
  if (body.name !== undefined) data.name = body.name
  if (body.tagId !== undefined) data.tagId = body.tagId || null

  const lead = await prisma.lead.update({ where: { id }, data })
  return NextResponse.json(lead)
}
