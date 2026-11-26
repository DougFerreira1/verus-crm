'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Send, Bot, User, Pause, Play, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { SafeDate, SafeTime } from '@/components/safe-format'

interface Message {
  id: string
  content: string
  sender: string
  isFromAgent: boolean
  createdAt: string
}

interface ConversationItem {
  id: string
  leadId: string
  unread: number
  lastMsg: string | null
  lastMsgAt: string | null
  lead: {
    id: string
    name: string
    phone: string
    aiHandled: boolean
    stage: string
  }
}

export default function ConversasPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [search, setSearch] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchConversations = useCallback(() => {
    fetch('/api/conversations')
      .then((r) => r.json())
      .then((d: any) => setConversations(d ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchConversations()
    const interval = setInterval(fetchConversations, 5000)
    return () => clearInterval(interval)
  }, [fetchConversations])

  const fetchMessages = useCallback((convId: string) => {
    fetch(`/api/conversations/${convId}/messages`)
      .then((r) => r.json())
      .then((d: any) => {
        setMessages(d ?? [])
        // mark as read
        fetch(`/api/conversations/${convId}/read`, { method: 'POST' }).catch(() => {})
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId)
      const interval = setInterval(() => fetchMessages(selectedId), 3000)
      return () => clearInterval(interval)
    }
  }, [selectedId, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [messages])

  const selectedConv = (conversations ?? []).find((c: ConversationItem) => c?.id === selectedId)

  const handleSend = async () => {
    if (!newMsg.trim() || !selectedId) return
    setSending(true)
    try {
      await fetch(`/api/conversations/${selectedId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMsg, sender: 'agent' }),
      })
      setNewMsg('')
      fetchMessages(selectedId)
      fetchConversations()
    } catch {
      toast.error('Erro ao enviar mensagem')
    } finally {
      setSending(false)
    }
  }

  const toggleAI = async () => {
    if (!selectedConv) return
    const leadId = selectedConv.lead?.id
    if (!leadId) return
    const newVal = !selectedConv.lead.aiHandled
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiHandled: newVal }),
      })
      fetchConversations()
      toast.success(newVal ? 'Agente de IA ativado' : 'Agente de IA pausado')
    } catch {
      toast.error('Erro ao alterar status do agente')
    }
  }

  const filtered = (conversations ?? []).filter((c: ConversationItem) => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return (
      c?.lead?.name?.toLowerCase()?.includes(s) ||
      c?.lead?.phone?.includes(s) ||
      c?.lastMsg?.toLowerCase()?.includes(s)
    )
  })

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      const now = new Date()
      if (d.toDateString() === now.toDateString()) return null // same day, show time only
      return dateStr
    } catch {
      return null
    }
  }

  return (
    <div className="h-screen flex flex-col md:flex-row">
      {/* Conversation list */}
      <div className="w-full md:w-[340px] border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border">
          <h1 className="font-display text-xl font-bold tracking-tight mb-3">Conversas</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversa..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {(filtered ?? []).length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Nenhuma conversa
            </div>
          ) : (
            (filtered ?? []).map((conv: ConversationItem) => (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className={`w-full text-left p-4 border-b border-border hover:bg-muted/50 transition-colors ${
                  selectedId === conv.id ? 'bg-muted' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {conv?.lead?.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">{conv?.lead?.name ?? 'Desconhecido'}</p>
                      {conv?.lastMsgAt && (
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          <SafeTime date={conv.lastMsgAt} options={{ hour: '2-digit', minute: '2-digit' }} />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {conv?.lastMsg ?? 'Sem mensagens'}
                    </p>
                  </div>
                  {(conv?.unread ?? 0) > 0 && (
                    <Badge className="bg-primary text-primary-foreground text-xs px-1.5 min-w-[20px] text-center">
                      {conv.unread}
                    </Badge>
                  )}
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-background">
        {!selectedConv ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">Selecione uma conversa</p>
              <p className="text-sm">Escolha uma conversa na lista ao lado</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="h-16 border-b border-border flex items-center justify-between px-4 bg-card">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {selectedConv?.lead?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="font-medium text-sm">{selectedConv?.lead?.name ?? 'Lead'}</p>
                  <p className="text-xs text-muted-foreground">{selectedConv?.lead?.phone ?? ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={selectedConv?.lead?.aiHandled ? 'default' : 'outline'} className="text-xs">
                  <Bot className="w-3 h-3 mr-1" />
                  {selectedConv?.lead?.aiHandled ? 'IA ativa' : 'IA pausada'}
                </Badge>
                <Button variant="ghost" size="icon" onClick={toggleAI} title={selectedConv?.lead?.aiHandled ? 'Pausar agente' : 'Ativar agente'}>
                  {selectedConv?.lead?.aiHandled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="max-w-2xl mx-auto space-y-3">
                {(messages ?? []).map((msg: Message) => {
                  const isMe = msg?.sender !== 'lead'
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                          isMe
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-card border border-border rounded-bl-md'
                        }`}
                      >
                        {msg?.isFromAgent && (
                          <div className={`text-xs mb-1 flex items-center gap-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            <Bot className="w-3 h-3" /> Agente IA
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg?.content ?? ''}</p>
                        <p className={`text-xs mt-1 ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'} text-right`}>
                          <SafeTime date={msg?.createdAt ?? '1970-01-01T00:00:00.000Z'} options={{ hour: '2-digit', minute: '2-digit' }} />
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t border-border p-3 bg-card">
              <div className="max-w-2xl mx-auto flex gap-2">
                <Input
                  placeholder="Digite uma mensagem..."
                  value={newMsg}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMsg(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  disabled={sending}
                  className="flex-1"
                />
                <Button onClick={handleSend} disabled={sending || !newMsg.trim()} size="icon">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
