export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  let config = await prisma.whatsAppConfig.findFirst({ orderBy: { updatedAt: 'desc' } })
  if (!config) {
    config = await prisma.whatsAppConfig.create({ data: {} })
  }
  return NextResponse.json(config)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  let config = await prisma.whatsAppConfig.findFirst({ orderBy: { updatedAt: 'desc' } })

  if (config) {
    config = await prisma.whatsAppConfig.update({
      where: { id: config.id },
      data: {
        instanceUrl: body.instanceUrl ?? config.instanceUrl,
        instanceName: body.instanceName ?? config.instanceName,
        apiToken: body.apiToken ?? config.apiToken,
        provider: body.provider ?? config.provider,
      },
    })
  } else {
    config = await prisma.whatsAppConfig.create({
      data: {
        instanceUrl: body.instanceUrl ?? '',
        instanceName: body.instanceName ?? '',
        apiToken: body.apiToken ?? '',
        provider: body.provider ?? 'z-api',
      },
    })
  }

  return NextResponse.json(config)
}
