export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await params

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(messages)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await params
  const body = await request.json()

  const message = await prisma.message.create({
    data: {
      conversationId: id,
      content: body.content,
      sender: body.sender ?? 'agent',
      isFromAgent: false,
    },
  })

  await prisma.conversation.update({
    where: { id },
    data: { lastMsg: body.content, lastMsgAt: new Date() },
  })

  return NextResponse.json(message, { status: 201 })
}
