import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Hidden test account (required)
  const testHash = await bcrypt.hash('XP5lk@mpLK', 10)
  await prisma.user.upsert({
    where: { email: 'abacus-6ca06e06@example.com' },
    update: {},
    create: {
      email: 'abacus-6ca06e06@example.com',
      password: testHash,
      name: 'Admin Test',
      role: 'admin',
    },
  })

  // User 1
  const hash1 = await bcrypt.hash('Crm@2024!', 10)
  await prisma.user.upsert({
    where: { email: 'usuario1@crm.com' },
    update: {},
    create: {
      email: 'usuario1@crm.com',
      password: hash1,
      name: 'Usuário 1',
      role: 'user',
    },
  })

  // User 2
  const hash2 = await bcrypt.hash('Crm@2024!', 10)
  await prisma.user.upsert({
    where: { email: 'usuario2@crm.com' },
    update: {},
    create: {
      email: 'usuario2@crm.com',
      password: hash2,
      name: 'Usuário 2',
      role: 'user',
    },
  })

  // Default agent config
  const existingConfig = await prisma.agentConfig.findFirst()
  if (!existingConfig) {
    await prisma.agentConfig.create({
      data: {
        prompt: `Você é um assistente comercial inteligente. Seu objetivo é atender leads que entram em contato pelo WhatsApp de forma profissional e amigável.

Suas responsabilidades:
1. Cumprimentar o lead e perguntar como pode ajudar
2. Entender a necessidade do lead fazendo perguntas relevantes
3. Qualificar o lead (orçamento, prazo, necessidade)
4. Oferecer os horários disponíveis para agendar uma reunião
5. Confirmar o agendamento quando o lead escolher um horário

Horários disponíveis para reuniões:
- Segunda-feira: das 11h às 16h
- Terça-feira: das 11h às 16h
- Quarta-feira: das 8h às 12h
- Sexta-feira: das 8h às 16h

Regras:
- Seja cordial e profissional
- Use português do Brasil
- Respostas curtas e diretas (máximo 3 parágrafos)
- Quando o lead demonstrar interesse, ofereça os horários
- Não invente informações sobre produtos ou serviços
- Se não souber algo, diga que vai verificar com a equipe`,
        model: 'gpt-4o-mini',
        active: true,
      },
    })
  }

  // Default tags
  await prisma.tag.upsert({ where: { name: 'Novo Lead' }, update: {}, create: { name: 'Novo Lead', color: '#3b82f6' } })
  await prisma.tag.upsert({ where: { name: 'Sem Follow-up' }, update: {}, create: { name: 'Sem Follow-up', color: '#6b7280' } })
  await prisma.tag.upsert({ where: { name: 'VIP' }, update: {}, create: { name: 'VIP', color: '#eab308' } })

  // Default WhatsApp config
  const existingWa = await prisma.whatsAppConfig.findFirst()
  if (!existingWa) {
    await prisma.whatsAppConfig.create({ data: {} })
  }

  // Default Google Calendar config
  const existingGc = await prisma.googleCalendarConfig.findFirst()
  if (!existingGc) {
    await prisma.googleCalendarConfig.create({ data: {} })
  }

  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
