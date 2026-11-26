export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const now = new Date()
  const results: { appointmentId: string; leadName: string; type: string; status: string }[] = []

  // Find appointments that need a 7-day reminder
  // Appointment is between 6 and 7 days from now and reminder not yet sent
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const sixDaysFromNow = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000)

  const appointments7d = await prisma.appointment.findMany({
    where: {
      reminder7dSent: false,
      date: {
        gte: sixDaysFromNow,
        lte: sevenDaysFromNow,
      },
    },
    include: { lead: true },
  })

  for (const appt of appointments7d) {
    const dateStr = format(new Date(appt.date), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })
    const message = `📅 Lembrete: Olá ${appt.lead.name}! Passando para lembrar que você tem uma reunião agendada para ${dateStr}. Falta 1 semana! Confirme sua presença respondendo esta mensagem. 🙏`

    try {
      await sendWhatsAppMessage(appt.lead.phone, message, appt.leadId)
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { reminder7dSent: true },
      })
      results.push({ appointmentId: appt.id, leadName: appt.lead.name, type: '7_dias', status: 'enviado' })
    } catch (err: any) {
      results.push({ appointmentId: appt.id, leadName: appt.lead.name, type: '7_dias', status: `erro: ${err?.message ?? 'desconhecido'}` })
    }
  }

  // Find appointments that need a 24h reminder
  // Appointment is between 23 and 25 hours from now and reminder not yet sent
  const twentyFiveHoursFromNow = new Date(now.getTime() + 25 * 60 * 60 * 1000)
  const twentyThreeHoursFromNow = new Date(now.getTime() + 23 * 60 * 60 * 1000)

  const appointments24h = await prisma.appointment.findMany({
    where: {
      reminder24hSent: false,
      date: {
        gte: twentyThreeHoursFromNow,
        lte: twentyFiveHoursFromNow,
      },
    },
    include: { lead: true },
  })

  for (const appt of appointments24h) {
    const dateStr = format(new Date(appt.date), "'amanhã às' HH:mm", { locale: ptBR })
    const message = `⏰ Lembrete: Olá ${appt.lead.name}! Sua reunião está marcada para ${dateStr}. Não esqueça! Caso precise reagendar, nos avise. 🙏`

    try {
      await sendWhatsAppMessage(appt.lead.phone, message, appt.leadId)
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { reminder24hSent: true },
      })
      results.push({ appointmentId: appt.id, leadName: appt.lead.name, type: '24h', status: 'enviado' })
    } catch (err: any) {
      results.push({ appointmentId: appt.id, leadName: appt.lead.name, type: '24h', status: `erro: ${err?.message ?? 'desconhecido'}` })
    }
  }

  return NextResponse.json({
    message: 'Lembretes processados',
    total: results.length,
    results,
  })
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Count upcoming appointments with pending reminders
  const pending7d = await prisma.appointment.count({
    where: {
      reminder7dSent: false,
      date: { gte: now, lte: sevenDaysFromNow },
    },
  })

  const twentyFiveHoursFromNow = new Date(now.getTime() + 25 * 60 * 60 * 1000)
  const pending24h = await prisma.appointment.count({
    where: {
      reminder24hSent: false,
      date: { gte: now, lte: twentyFiveHoursFromNow },
    },
  })

  const totalSent = await prisma.appointment.count({
    where: {
      OR: [
        { reminder7dSent: true },
        { reminder24hSent: true },
      ],
    },
  })

  return NextResponse.json({
    pending7d,
    pending24h,
    totalSent,
  })
}
