import { prisma } from '@/lib/db'

// Schedule: continuous hour ranges [startHour, endHour] (endHour inclusive)
const SCHEDULE: Record<number, [number, number]> = {
  1: [11, 16],  // Segunda 11h-16h
  2: [11, 16],  // Terça 11h-16h
  3: [8, 12],   // Quarta 8h-12h
  5: [8, 16],   // Sexta 8h-16h
}

function getHoursForDay(dayOfWeek: number): number[] {
  const range = SCHEDULE[dayOfWeek]
  if (!range) return []
  const [start, end] = range
  const hours: number[] = []
  for (let h = start; h <= end; h++) {
    hours.push(h)
  }
  return hours
}

export async function getAvailableSlots(limit = 10): Promise<string[]> {
  const slots: string[] = []
  const now = new Date()
  let checkDate = new Date(now)
  checkDate.setHours(0, 0, 0, 0)

  for (let i = 0; i < 30 && slots.length < limit; i++) {
    const dayOfWeek = checkDate.getDay()
    const hours = getHoursForDay(dayOfWeek)

    for (const hour of hours) {
      const slotDate = new Date(checkDate)
      slotDate.setHours(hour, 0, 0, 0)
      if (slotDate <= now) continue

      const existing = await prisma.appointment.findFirst({
        where: {
          date: {
            gte: slotDate,
            lt: new Date(slotDate.getTime() + 60 * 60 * 1000),
          },
        },
      })

      if (!existing) {
        const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
        const dayName = dayNames[dayOfWeek] ?? ''
        const dateStr = slotDate.toLocaleDateString('pt-BR')
        slots.push(`${dayName}, ${dateStr} às ${String(hour).padStart(2, '0')}:00`)
      }

      if (slots.length >= limit) break
    }

    checkDate.setDate(checkDate.getDate() + 1)
  }

  return slots
}

export async function processAgentResponse(
  leadId: string,
  conversationId: string,
  userMessage: string
): Promise<ReadableStream | null> {
  const config = await prisma.agentConfig.findFirst({ orderBy: { updatedAt: 'desc' } })
  if (!config || !config.active) return null

  const apiKey = process.env.ABACUSAI_API_KEY
  if (!apiKey) return null

  // Get conversation history
  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 20,
  })

  // Get available slots
  const slots = await getAvailableSlots(6)
  const slotsText = slots.length > 0
    ? `\n\nHorários disponíveis para agendar:\n${slots.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}`
    : '\n\nNão há horários disponíveis no momento.'

  const systemPrompt = config.prompt + slotsText

  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
    ...(history ?? []).map((m: any) => ({
      role: m.sender === 'lead' ? 'user' : 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ]

  const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: true,
      max_tokens: 1000,
    }),
  })

  if (!response.ok || !response.body) return null

  return response.body
}

export async function extractAndSaveAgentResponse(
  stream: ReadableStream,
  leadId: string,
  conversationId: string
): Promise<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let partialRead = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      partialRead += decoder.decode(value, { stream: true })
      const lines = partialRead.split('\n')
      partialRead = lines.pop() ?? ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            const content = parsed?.choices?.[0]?.delta?.content ?? ''
            buffer += content
          } catch {}
        }
      }
    }
  } catch {}

  if (buffer) {
    // Save agent response as message
    await prisma.message.create({
      data: {
        conversationId,
        content: buffer,
        sender: 'agent',
        isFromAgent: true,
      },
    })

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMsg: buffer, lastMsgAt: new Date() },
    })

    // Auto-move to em_atendimento if still novo_lead
    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (lead?.stage === 'novo_lead') {
      await prisma.lead.update({
        where: { id: leadId },
        data: { stage: 'em_atendimento', autoMoved: true },
      })
    }
  }

  return buffer
}
