export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { processAgentResponse, extractAndSaveAgentResponse } from '@/lib/agent'

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { phone, name, message } = await request.json()
  if (!phone || !message) {
    return NextResponse.json({ error: 'Telefone e mensagem são obrigatórios' }, { status: 400 })
  }

  // Find or create lead
  let lead = await prisma.lead.findUnique({ where: { phone } })
  if (!lead) {
    // Auto-assign 'Novo Lead' tag
    const novoLeadTag = await prisma.tag.findUnique({ where: { name: 'Novo Lead' } })
    lead = await prisma.lead.create({
      data: {
        name: name ?? 'Lead ' + phone.slice(-4),
        phone,
        stage: 'novo_lead',
        origin: 'simulador',
        aiHandled: true,
        lastMessageAt: new Date(),
        tagId: novoLeadTag?.id ?? null,
      },
    })
  } else {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { lastMessageAt: new Date() },
    })
  }

  // Find or create conversation
  let conversation = await prisma.conversation.findFirst({
    where: { leadId: lead.id },
    orderBy: { createdAt: 'desc' },
  })

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        leadId: lead.id,
        unread: 1,
        lastMsg: message,
        lastMsgAt: new Date(),
      },
    })
  } else {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { unread: { increment: 1 }, lastMsg: message, lastMsgAt: new Date() },
    })
  }

  // Save incoming message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      content: message,
      sender: 'lead',
      isFromAgent: false,
    },
  })

  // Process agent response
  if (!lead.aiHandled) {
    return NextResponse.json({ response: 'Agente de IA está pausado para este lead.' })
  }

  const agentStream = await processAgentResponse(lead.id, conversation.id, message)
  if (!agentStream) {
    return NextResponse.json({ error: 'Agente não configurado ou inativo' }, { status: 400 })
  }

  // Clone the stream: one for the client, one for saving
  const [clientStream, saveStream] = agentStream.tee()

  // Save in background
  extractAndSaveAgentResponse(saveStream, lead.id, conversation.id).catch(() => {})

  // Stream to client
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const outputStream = new ReadableStream({
    async start(controller) {
      const reader = clientStream.getReader()
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
              if (data === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                continue
              }
              try {
                const parsed = JSON.parse(data)
                const content = parsed?.choices?.[0]?.delta?.content ?? ''
                if (content) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'content', content })}\n\n`)
                  )
                }
              } catch {}
            }
          }
        }
      } catch (error: any) {
        controller.error(error)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(outputStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
