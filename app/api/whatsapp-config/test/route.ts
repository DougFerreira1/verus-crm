export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const config = await prisma.whatsAppConfig.findFirst({ orderBy: { updatedAt: 'desc' } })
  if (!config || !config.instanceUrl || !config.apiToken) {
    return NextResponse.json({ connected: false, error: 'Configuração incompleta. Preencha URL e Token.' })
  }

  try {
    // Try to reach the instance
    const url = config.provider === 'z-api'
      ? `${config.instanceUrl}/status`
      : `${config.instanceUrl}/instance/connectionState/${config.instanceName}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (config.provider === 'z-api') {
      headers['Client-Token'] = config.apiToken
    } else {
      headers['apikey'] = config.apiToken
    }

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) })
    if (res.ok) {
      await prisma.whatsAppConfig.update({ where: { id: config.id }, data: { connected: true } })
      return NextResponse.json({ connected: true })
    }
    return NextResponse.json({ connected: false, error: `Status ${res.status}` })
  } catch (error: any) {
    return NextResponse.json({ connected: false, error: error?.message ?? 'Falha na conexão' })
  }
}
