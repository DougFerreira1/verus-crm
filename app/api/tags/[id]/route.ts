export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await params

  // Don't allow deleting 'Novo Lead' tag
  const tag = await prisma.tag.findUnique({ where: { id } })
  if (!tag) return NextResponse.json({ error: 'Tag não encontrada' }, { status: 404 })
  if (tag.name === 'Novo Lead') {
    return NextResponse.json({ error: 'Não é possível excluir a tag padrão' }, { status: 400 })
  }

  // Move leads to 'Novo Lead' tag before deleting
  const defaultTag = await prisma.tag.findUnique({ where: { name: 'Novo Lead' } })
  if (defaultTag) {
    await prisma.lead.updateMany({ where: { tagId: id }, data: { tagId: defaultTag.id } })
  }

  await prisma.tag.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await params
  const body = await request.json()

  const data: any = {}
  if (body.name !== undefined) data.name = body.name.trim()
  if (body.color !== undefined) data.color = body.color

  const tag = await prisma.tag.update({ where: { id }, data })
  return NextResponse.json(tag)
}
