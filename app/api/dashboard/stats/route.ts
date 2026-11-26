export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const [totalLeads, novoLead, emAtendimento, agendado, conversasAtivas, mensagensAgente] =
      await Promise.all([
        prisma.lead.count(),
        prisma.lead.count({ where: { stage: 'novo_lead' } }),
        prisma.lead.count({ where: { stage: 'em_atendimento' } }),
        prisma.lead.count({ where: { stage: 'agendado' } }),
        prisma.conversation.count({ where: { unread: { gt: 0 } } }),
        prisma.message.count({ where: { isFromAgent: true } }),
      ])

    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay() + 1)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    const reunioesEstaSemana = await prisma.appointment.count({
      where: { date: { gte: weekStart, lte: weekEnd } },
    })

    const followUpsEnviados = await prisma.lead.count({
      where: { followUpCount: { gt: 0 } },
    })

    return NextResponse.json({
      totalLeads,
      novoLead,
      emAtendimento,
      agendado,
      conversasAtivas,
      reunioesEstaSemana,
      mensagensAgente,
      followUpsEnviados,
    })
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 })
  }
}
