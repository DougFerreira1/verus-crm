export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const tags = await prisma.tag.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { leads: true } } },
  })
  return NextResponse.json(tags)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Nome da tag é obrigatório' }, { status: 400 })
  }

  const existing = await prisma.tag.findUnique({ where: { name: body.name.trim() } })
  if (existing) {
    return NextResponse.json({ error: 'Tag já existe' }, { status: 409 })
  }

  const tag = await prisma.tag.create({
    data: {
      name: body.name.trim(),
      color: body.color ?? '#3b82f6',
    },
  })
  return NextResponse.json(tag, { status: 201 })
}
