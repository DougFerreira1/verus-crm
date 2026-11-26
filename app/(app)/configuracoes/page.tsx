'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { FadeIn } from '@/components/ui/animate'
import { Settings, Plug, Calendar, MessageSquare, Send, Loader2, Bot, CheckCircle2, XCircle, Smartphone, Tag, RefreshCw, Plus, Trash2, Clock, Bell } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ConfiguracoesPage() {
  // WhatsApp config
  const [waUrl, setWaUrl] = useState('')
  const [waName, setWaName] = useState('')
  const [waToken, setWaToken] = useState('')
  const [waConnected, setWaConnected] = useState(false)
  const [waProvider, setWaProvider] = useState('z-api')
  const [waSaving, setWaSaving] = useState(false)
  const [waTesting, setWaTesting] = useState(false)

  // Google Calendar config
  const [gcCalendarId, setGcCalendarId] = useState('primary')
  const [gcConnected, setGcConnected] = useState(false)
  const [gcSaving, setGcSaving] = useState(false)

  // Tags
  const [tags, setTags] = useState<any[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#3b82f6')
  const [tagSaving, setTagSaving] = useState(false)

  // Follow-up
  const [followUpStatus, setFollowUpStatus] = useState<any>(null)
  const [processingFollowUp, setProcessingFollowUp] = useState(false)

  // Reminders
  const [reminderStatus, setReminderStatus] = useState<any>(null)
  const [processingReminders, setProcessingReminders] = useState(false)

  // Simulator
  const [simPhone, setSimPhone] = useState('5511999990001')
  const [simName, setSimName] = useState('Lead Simulado')
  const [simMsg, setSimMsg] = useState('')
  const [simResponse, setSimResponse] = useState('')
  const [simulating, setSimulating] = useState(false)

  useEffect(() => {
    fetch('/api/whatsapp-config')
      .then((r) => r.json())
      .then((d: any) => {
        if (d) {
          setWaUrl(d?.instanceUrl ?? '')
          setWaName(d?.instanceName ?? '')
          setWaToken(d?.apiToken ?? '')
          setWaConnected(d?.connected ?? false)
          setWaProvider(d?.provider ?? 'z-api')
        }
      })
      .catch(() => {})

    fetch('/api/google-calendar-config')
      .then((r) => r.json())
      .then((d: any) => {
        if (d) {
          setGcCalendarId(d?.calendarId ?? 'primary')
          setGcConnected(d?.connected ?? false)
        }
      })
      .catch(() => {})

    fetchTags()
    fetchFollowUpStatus()
    fetchReminderStatus()
  }, [])

  const fetchTags = () => {
    fetch('/api/tags')
      .then((r) => r.json())
      .then((d: any) => setTags(d ?? []))
      .catch(() => {})
  }

  const fetchFollowUpStatus = () => {
    fetch('/api/follow-up/process')
      .then((r) => r.json())
      .then((d: any) => setFollowUpStatus(d))
      .catch(() => {})
  }

  const saveWhatsApp = async () => {
    setWaSaving(true)
    try {
      await fetch('/api/whatsapp-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceUrl: waUrl, instanceName: waName, apiToken: waToken, provider: waProvider }),
      })
      toast.success('Configuração do WhatsApp salva!')
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setWaSaving(false)
    }
  }

  const testWhatsApp = async () => {
    setWaTesting(true)
    try {
      const res = await fetch('/api/whatsapp-config/test', { method: 'POST' })
      const data = await res.json()
      if (data?.connected) {
        setWaConnected(true)
        toast.success('Conexão bem sucedida!')
      } else {
        setWaConnected(false)
        toast.error(data?.error ?? 'Falha na conexão')
      }
    } catch {
      toast.error('Erro ao testar conexão')
    } finally {
      setWaTesting(false)
    }
  }

  const saveGoogleCalendar = async () => {
    setGcSaving(true)
    try {
      await fetch('/api/google-calendar-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarId: gcCalendarId }),
      })
      toast.success('Configuração do Google Agenda salva!')
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setGcSaving(false)
    }
  }

  const fetchReminderStatus = () => {
    fetch('/api/reminders/process')
      .then((r) => r.json())
      .then((d: any) => setReminderStatus(d))
      .catch(() => {})
  }

  const processReminders = async () => {
    setProcessingReminders(true)
    try {
      const res = await fetch('/api/reminders/process', { method: 'POST' })
      const data = await res.json()
      toast.success(`${data?.total ?? 0} lembrete(s) enviado(s)`)
      fetchReminderStatus()
    } catch {
      toast.error('Erro ao processar lembretes')
    } finally {
      setProcessingReminders(false)
    }
  }

  const createTag = async () => {
    if (!newTagName.trim()) return
    setTagSaving(true)
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err?.error ?? 'Erro ao criar tag')
        return
      }
      toast.success('Tag criada!')
      setNewTagName('')
      fetchTags()
    } catch {
      toast.error('Erro ao criar tag')
    } finally {
      setTagSaving(false)
    }
  }

  const deleteTag = async (id: string) => {
    try {
      const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err?.error ?? 'Erro ao excluir tag')
        return
      }
      toast.success('Tag excluída')
      fetchTags()
    } catch {
      toast.error('Erro ao excluir tag')
    }
  }

  const processFollowUp = async () => {
    setProcessingFollowUp(true)
    try {
      const res = await fetch('/api/follow-up/process', { method: 'POST' })
      const data = await res.json()
      toast.success(`${data?.processed ?? 0} follow-up(s) enviado(s) de ${data?.total ?? 0} elegível(eis)`)
      fetchFollowUpStatus()
    } catch {
      toast.error('Erro ao processar follow-up')
    } finally {
      setProcessingFollowUp(false)
    }
  }

  const handleSimulate = async () => {
    if (!simMsg.trim()) return
    setSimulating(true)
    setSimResponse('')
    try {
      const res = await fetch('/api/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: simPhone, name: simName, message: simMsg }),
      })

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}))
        toast.error((err as any)?.error ?? 'Erro ao simular')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let partialRead = ''

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
              if (parsed?.type === 'content') {
                setSimResponse((prev) => prev + (parsed?.content ?? ''))
              }
            } catch {}
          }
        }
      }
      toast.success('Simulação completa! Lead criado no Kanban.')
    } catch {
      toast.error('Erro ao simular')
    } finally {
      setSimulating(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-[900px]">
      <FadeIn>
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground mt-1">Gerencie as integrações e configurações do CRM</p>
        </div>
      </FadeIn>

      <Tabs defaultValue="whatsapp" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="whatsapp"><Smartphone className="w-4 h-4 mr-1" /> WhatsApp</TabsTrigger>
          <TabsTrigger value="google"><Calendar className="w-4 h-4 mr-1" /> Google Agenda</TabsTrigger>
          <TabsTrigger value="tags"><Tag className="w-4 h-4 mr-1" /> Tags</TabsTrigger>
          <TabsTrigger value="followup"><RefreshCw className="w-4 h-4 mr-1" /> Follow-up</TabsTrigger>
          <TabsTrigger value="reminders"><Bell className="w-4 h-4 mr-1" /> Lembretes</TabsTrigger>
          <TabsTrigger value="simulator"><MessageSquare className="w-4 h-4 mr-1" /> Simulador</TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Plug className="w-5 h-5 text-primary" />
                    WhatsApp (API Não Oficial)
                  </CardTitle>
                  <CardDescription className="mt-1">Configure a conexão com Z-API ou Evolution API</CardDescription>
                </div>
                <Badge variant={waConnected ? 'default' : 'destructive'}>
                  {waConnected ? <><CheckCircle2 className="w-3 h-3 mr-1" /> Conectado</> : <><XCircle className="w-3 h-3 mr-1" /> Desconectado</>}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Provedor</Label>
                <div className="flex gap-2">
                  <Button variant={waProvider === 'z-api' ? 'default' : 'outline'} size="sm" onClick={() => setWaProvider('z-api')}>
                    Z-API
                  </Button>
                  <Button variant={waProvider === 'evolution' ? 'default' : 'outline'} size="sm" onClick={() => setWaProvider('evolution')}>
                    Evolution API
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>URL da Instância</Label>
                <Input
                  placeholder="https://api.z-api.io/instances/..."
                  value={waUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWaUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Nome da Instância</Label>
                <Input
                  placeholder="minha-instancia"
                  value={waName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWaName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Token / API Key</Label>
                <Input
                  type="password"
                  placeholder="Seu token de acesso"
                  value={waToken}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWaToken(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveWhatsApp} disabled={waSaving}>
                  {waSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Settings className="w-4 h-4 mr-2" />}
                  Salvar
                </Button>
                <Button variant="outline" onClick={testWhatsApp} disabled={waTesting}>
                  {waTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plug className="w-4 h-4 mr-2" />}
                  Testar Conexão
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="google">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Google Agenda
                  </CardTitle>
                  <CardDescription className="mt-1">Configure a integração com o Google Calendar</CardDescription>
                </div>
                <Badge variant={gcConnected ? 'default' : 'outline'}>
                  {gcConnected ? 'Conectado' : 'Não conectado'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                <p className="font-medium mb-1">ℹ️ Modo local ativo</p>
                <p>Enquanto a conexão com o Google não estiver configurada, as reuniões serão salvas localmente e marcadas como pendentes de sincronização.</p>
              </div>
              <div className="space-y-2">
                <Label>ID do Calendário</Label>
                <Input
                  placeholder="primary"
                  value={gcCalendarId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGcCalendarId(e.target.value)}
                />
              </div>
              <Button onClick={saveGoogleCalendar} disabled={gcSaving}>
                {gcSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Settings className="w-4 h-4 mr-2" />}
                Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tags">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" />
                Gerenciar Tags
              </CardTitle>
              <CardDescription>Tags são usadas para controlar o follow-up automático. Leads com a tag "Novo Lead" recebem follow-up. Troque a tag para desativar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing tags */}
              <div className="space-y-2">
                {tags.map((tag: any) => (
                  <div key={tag.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-card">
                    <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                    <span className="font-medium text-sm flex-1">{tag.name}</span>
                    <Badge variant="secondary" className="text-xs">{tag._count?.leads ?? 0} leads</Badge>
                    {tag.name === 'Novo Lead' ? (
                      <Badge variant="outline" className="text-xs text-primary border-primary/30">
                        <RefreshCw className="w-3 h-3 mr-1" /> Follow-up ativo
                      </Badge>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => deleteTag(tag.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Create new tag */}
              <div className="border-t pt-4">
                <Label className="text-sm font-medium mb-2 block">Criar nova tag</Label>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input
                      placeholder="Nome da tag"
                      value={newTagName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTagName(e.target.value)}
                    />
                  </div>
                  <div>
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border cursor-pointer"
                    />
                  </div>
                  <Button onClick={createTag} disabled={tagSaving || !newTagName.trim()}>
                    {tagSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Criar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="followup">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-primary" />
                Follow-up Automático
              </CardTitle>
              <CardDescription>
                O follow-up é enviado UMA ÚNICA VEZ para leads com a tag "Novo Lead" que não respondem há mais de 24 horas, apenas em horário comercial (Seg-Sex, 08h-18h).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-center">
                  <p className="text-2xl font-bold font-mono text-blue-700">{followUpStatus?.eligible ?? 0}</p>
                  <p className="text-xs text-blue-600 mt-1">Elegíveis para follow-up</p>
                </div>
                <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
                  <p className="text-2xl font-bold font-mono text-green-700">{followUpStatus?.recentFollowUps ?? 0}</p>
                  <p className="text-xs text-green-600 mt-1">Follow-ups nas últimas 24h</p>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <p className="text-sm font-semibold text-amber-700">
                      {followUpStatus?.isBusinessHours ? 'Horário comercial' : 'Fora do horário'}
                    </p>
                  </div>
                  <p className="text-xs text-amber-600 mt-1">Seg-Sex, 08h às 18h</p>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 border p-4 text-sm space-y-2">
                <p className="font-medium">Como funciona:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>O agente envia uma mensagem de follow-up gentil para leads com a tag <strong>"Novo Lead"</strong> que não respondem há 24h+</li>
                  <li>Funciona apenas em <strong>horário comercial</strong> (Segunda a Sexta, 08h às 18h)</li>
                  <li>Para desativar o follow-up de um lead específico, troque a tag dele no Kanban</li>
                  <li>O follow-up é enviado <strong>apenas uma vez</strong> por lead — não repete</li>
                </ul>
              </div>

              <Button onClick={processFollowUp} disabled={processingFollowUp} className="w-full sm:w-auto">
                {processingFollowUp ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Executar Follow-up Agora
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Lembretes de Agendamento
              </CardTitle>
              <CardDescription>
                Envia lembretes no WhatsApp para leads com reunião agendada: 1 semana antes e 24 horas antes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-center">
                  <p className="text-2xl font-bold font-mono text-blue-700">{reminderStatus?.pending7d ?? 0}</p>
                  <p className="text-xs text-blue-600 mt-1">Pendentes (7 dias)</p>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-center">
                  <p className="text-2xl font-bold font-mono text-amber-700">{reminderStatus?.pending24h ?? 0}</p>
                  <p className="text-xs text-amber-600 mt-1">Pendentes (24h)</p>
                </div>
                <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
                  <p className="text-2xl font-bold font-mono text-green-700">{reminderStatus?.totalSent ?? 0}</p>
                  <p className="text-xs text-green-600 mt-1">Lembretes já enviados</p>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 border p-4 text-sm space-y-2">
                <p className="font-medium">Como funciona:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Quando um lead agenda uma reunião, ele recebe <strong>2 lembretes</strong> no WhatsApp</li>
                  <li>📅 <strong>1ª lembrete:</strong> 1 semana antes da reunião</li>
                  <li>⏰ <strong>2º lembrete:</strong> 24 horas antes da reunião</li>
                  <li>Os lembretes são enviados pelo WhatsApp (ou salvos na conversa em modo simulado)</li>
                  <li>Cada lembrete é enviado apenas 1 vez por agendamento</li>
                </ul>
              </div>

              <Button onClick={processReminders} disabled={processingReminders} className="w-full sm:w-auto">
                {processingReminders ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
                Enviar Lembretes Agora
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulator">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                Simulador de WhatsApp
              </CardTitle>
              <CardDescription>Envie mensagens simuladas como se fosse um lead. O agente de IA responde de verdade e o lead é criado no Kanban.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Lead</Label>
                  <Input
                    placeholder="João Silva"
                    value={simName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSimName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    placeholder="5511999990001"
                    value={simPhone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSimPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea
                  placeholder="Olá, gostaria de saber mais sobre..."
                  value={simMsg}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSimMsg(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              <Button onClick={handleSimulate} disabled={simulating || !simMsg.trim()}>
                {simulating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Enviar como Lead
              </Button>
              {simResponse && (
                <div className="rounded-lg bg-primary/5 border border-primary/10 p-4">
                  <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                    <Bot className="w-4 h-4" /> Resposta do Agente:
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{simResponse}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
