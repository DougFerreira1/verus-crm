export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { processAgentResponse, extractAndSaveAgentResponse } from '@/lib/agent'

// Webhook for receiving WhatsApp messages (Z-API or Evolution API)
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Extract message data based on provider format
    let phone = ''
    let messageText = ''
    let senderName = ''

    // Z-API format
    if (body?.phone) {
      phone = body.phone?.replace(/\D/g, '') ?? ''
      messageText = body?.text?.message ?? body?.body ?? ''
      senderName = body?.senderName ?? body?.pushName ?? ''
    }
    // Evolution API format
    else if (body?.data?.key?.remoteJid) {
      const jid = body.data.key.remoteJid ?? ''
      phone = jid.split('@')[0] ?? ''
      messageText = body?.data?.message?.conversation ?? body?.data?.message?.extendedTextMessage?.text ?? ''
      senderName = body?.data?.pushName ?? ''
    }

    if (!phone || !messageText) {
      return NextResponse.json({ status: 'ignored' })
    }

    // Find or create lead
    let lead = await prisma.lead.findUnique({ where: { phone } })
    if (!lead) {
      const novoLeadTag = await prisma.tag.findUnique({ where: { name: 'Novo Lead' } })
      lead = await prisma.lead.create({
        data: {
          name: senderName || 'Lead ' + phone.slice(-4),
          phone,
          stage: 'novo_lead',
          origin: 'whatsapp',
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
          lastMsg: messageText,
          lastMsgAt: new Date(),
        },
      })
    } else {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { unread: { increment: 1 }, lastMsg: messageText, lastMsgAt: new Date() },
      })
    }

    // Save incoming message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        content: messageText,
        sender: 'lead',
        isFromAgent: false,
      },
    })

    // Process AI agent response
    if (lead.aiHandled) {
      const agentStream = await processAgentResponse(lead.id, conversation.id, messageText)
      if (agentStream) {
        const responseText = await extractAndSaveAgentResponse(agentStream, lead.id, conversation.id)

        // Send reply via WhatsApp API
        if (responseText) {
          const waConfig = await prisma.whatsAppConfig.findFirst({ orderBy: { updatedAt: 'desc' } })
          if (waConfig?.connected && waConfig.instanceUrl && waConfig.apiToken) {
            try {
              const sendUrl = waConfig.provider === 'z-api'
                ? `${waConfig.instanceUrl}/send-text`
                : `${waConfig.instanceUrl}/message/sendText/${waConfig.instanceName}`

              const sendBody = waConfig.provider === 'z-api'
                ? { phone, message: responseText }
                : { number: phone, text: responseText }

              const headers: Record<string, string> = { 'Content-Type': 'application/json' }
              if (waConfig.provider === 'z-api') {
                headers['Client-Token'] = waConfig.apiToken
              } else {
                headers['apikey'] = waConfig.apiToken
              }

              await fetch(sendUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(sendBody),
              })
            } catch {
              console.error('Erro ao enviar mensagem via WhatsApp')
            }
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'webhook active' })
}
