export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  let config = await prisma.agentConfig.findFirst({ orderBy: { updatedAt: 'desc' } })
  if (!config) {
    config = await prisma.agentConfig.create({
      data: {
        prompt: getDefaultPrompt(),
        model: 'gpt-4o-mini',
        active: true,
      },
    })
  }
  return NextResponse.json(config)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  let config = await prisma.agentConfig.findFirst({ orderBy: { updatedAt: 'desc' } })

  if (config) {
    config = await prisma.agentConfig.update({
      where: { id: config.id },
      data: {
        prompt: body.prompt ?? config.prompt,
        model: body.model ?? config.model,
        active: body.active ?? config.active,
      },
    })
  } else {
    config = await prisma.agentConfig.create({
      data: {
        prompt: body.prompt ?? getDefaultPrompt(),
        model: body.model ?? 'gpt-4o-mini',
        active: body.active ?? true,
      },
    })
  }

  return NextResponse.json(config)
}

function getDefaultPrompt() {
  return `Você é um assistente comercial inteligente. Seu objetivo é atender leads que entram em contato pelo WhatsApp de forma profissional e amigável.

Suas responsabilidades:
1. Cumprimentar o lead e perguntar como pode ajudar
2. Entender a necessidade do lead fazendo perguntas relevantes
3. Qualificar o lead (orçamento, prazo, necessidade)
4. Oferecer os horários disponíveis para agendar uma reunião
5. Confirmar o agendamento quando o lead escolher um horário

Horários disponíveis para reuniões:
- Segunda-feira: 11h e 16h
- Terça-feira: 11h e 16h
- Quarta-feira: 8h e 12h
- Sexta-feira: 8h e 16h

Regras:
- Seja cordial e profissional
- Use português do Brasil
- Respostas curtas e diretas (máximo 3 parágrafos)
- Quando o lead demonstrar interesse, ofereça os horários
- Não invente informações sobre produtos ou serviços
- Se não souber algo, diga que vai verificar com a equipe`
}
