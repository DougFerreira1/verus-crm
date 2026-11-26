import { prisma } from '@/lib/db'

/**
 * Send a WhatsApp message via the configured API (Z-API or Evolution API).
 * Falls back to saving the message in the conversation (simulated mode)
 * if no WhatsApp connection is configured.
 */
export async function sendWhatsAppMessage(
  phone: string,
  message: string,
  leadId?: string
): Promise<{ sent: boolean; simulated: boolean }> {
  const config = await prisma.whatsAppConfig.findFirst()

  // Try real WhatsApp API if connected
  if (config?.connected && config.instanceUrl && config.apiToken) {
    try {
      const url = config.provider === 'evolution'
        ? `${config.instanceUrl}/message/sendText/${config.instanceName}`
        : `${config.instanceUrl}/send-text`

      const body = config.provider === 'evolution'
        ? { number: phone, text: message }
        : { phone, message }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: config.apiToken,
          Authorization: `Bearer ${config.apiToken}`,
        },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        // Also save to conversation
        if (leadId) {
          await saveMessageToConversation(leadId, message)
        }
        return { sent: true, simulated: false }
      }
    } catch {
      // Fall through to simulated mode
    }
  }

  // Simulated mode: save message in conversation
  if (leadId) {
    await saveMessageToConversation(leadId, message)
  }
  return { sent: true, simulated: true }
}

async function saveMessageToConversation(leadId: string, message: string) {
  let conversation = await prisma.conversation.findFirst({
    where: { leadId },
    orderBy: { createdAt: 'desc' },
  })

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        leadId,
        lastMsg: message,
        lastMsgAt: new Date(),
      },
    })
  }

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      content: message,
      sender: 'agent',
      isFromAgent: true,
    },
  })

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMsg: message, lastMsgAt: new Date() },
  })
}
