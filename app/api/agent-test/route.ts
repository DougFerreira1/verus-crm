export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { message } = await request.json()
  if (!message) return NextResponse.json({ error: 'Mensagem obrigatória' }, { status: 400 })

  const config = await prisma.agentConfig.findFirst({ orderBy: { updatedAt: 'desc' } })
  if (!config) return NextResponse.json({ error: 'Configure o agente primeiro' }, { status: 400 })

  const apiKey = process.env.ABACUSAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Chave de API não configurada' }, { status: 500 })

  const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: config.prompt },
        { role: 'user', content: message },
      ],
      stream: true,
      max_tokens: 1000,
    }),
  })

  if (!response.ok || !response.body) {
    return NextResponse.json({ error: 'Erro ao chamar API de IA' }, { status: 502 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      const encoder = new TextEncoder()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          controller.enqueue(encoder.encode(decoder.decode(value)))
        }
      } catch (error: any) {
        controller.error(error)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
