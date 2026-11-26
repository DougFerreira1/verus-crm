export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { processAgentResponse, extractAndSaveAgentResponse } from '@/lib/agent'

function isBusinessHours(): boolean {
  // Brazil timezone (America/Sao_Paulo)
  const now = new Date()
  const brTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const day = brTime.getDay() // 0=Sun, 1=Mon...6=Sat
  const hour = brTime.getHours()
  // Mon-Fri, 8h-18h
  return day >= 1 && day <= 5 && hour >= 8 && hour < 18
}

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  if (!isBusinessHours()) {
    return NextResponse.json({ message: 'Fora do horário comercial', processed: 0 })
  }

  // Find the 'Novo Lead' tag
  const novoLeadTag = await prisma.tag.findUnique({ where: { name: 'Novo Lead' } })
  if (!novoLeadTag) {
    return NextResponse.json({ message: 'Tag Novo Lead não encontrada', processed: 0 })
  }

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Find leads with 'Novo Lead' tag where last message is > 24h ago
  // and NO follow-up has ever been sent (only 1 follow-up per lead)
  const leads = await prisma.lead.findMany({
    where: {
      tagId: novoLeadTag.id,
      aiHandled: true,
      followUpCount: 0,
      lastMessageAt: {
        not: null,
        lt: twentyFourHoursAgo,
      },
    },
    include: {
      conversations: {
        take: 1,
        orderBy: { lastMsgAt: 'desc' },
      },
    },
  })

  let processed = 0
  const results: { leadId: string; name: string; status: string }[] = []

  for (const lead of leads) {
    const conversation = lead.conversations[0]
    if (!conversation) {
      results.push({ leadId: lead.id, name: lead.name, status: 'sem_conversa' })
      continue
    }

    try {
      const followUpMessage = `[FOLLOW-UP AUTOMÁTICO] O lead ${lead.name} não responde há mais de 24 horas. Envie uma mensagem de follow-up gentil perguntando se posso ajudar com algo.`

      const stream = await processAgentResponse(lead.id, conversation.id, followUpMessage)
      if (stream) {
        const response = await extractAndSaveAgentResponse(stream, lead.id, conversation.id)
        if (response) {
          await prisma.lead.update({
            where: { id: lead.id },
            data: {
              lastFollowUpAt: new Date(),
              followUpCount: { increment: 1 },
            },
          })
          processed++
          results.push({ leadId: lead.id, name: lead.name, status: 'enviado' })
        } else {
          results.push({ leadId: lead.id, name: lead.name, status: 'sem_resposta_agente' })
        }
      } else {
        results.push({ leadId: lead.id, name: lead.name, status: 'agente_inativo' })
      }
    } catch (error: any) {
      results.push({ leadId: lead.id, name: lead.name, status: `erro: ${error?.message ?? 'desconhecido'}` })
    }
  }

  return NextResponse.json({
    message: `Follow-up processado`,
    processed,
    total: leads.length,
    results,
  })
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // Return follow-up status info
  const novoLeadTag = await prisma.tag.findUnique({ where: { name: 'Novo Lead' } })
  if (!novoLeadTag) {
    return NextResponse.json({ eligible: 0, recentFollowUps: 0, isBusinessHours: isBusinessHours() })
  }

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const eligible = await prisma.lead.count({
    where: {
      tagId: novoLeadTag.id,
      aiHandled: true,
      followUpCount: 0,
      lastMessageAt: {
        not: null,
        lt: twentyFourHoursAgo,
      },
    },
  })

  const recentFollowUps = await prisma.lead.count({
    where: {
      lastFollowUpAt: { gte: twentyFourHoursAgo },
    },
  })

  return NextResponse.json({
    eligible,
    recentFollowUps,
    isBusinessHours: isBusinessHours(),
  })
}
