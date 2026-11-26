'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FadeIn } from '@/components/ui/animate'
import { Bot, Save, Loader2, Send, Power, Zap, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

const MODELS = [
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { id: 'gpt-4.1', label: 'GPT-4.1' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
]

export default function AgentePage() {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('gpt-4o-mini')
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Test area
  const [testMsg, setTestMsg] = useState('')
  const [testResponse, setTestResponse] = useState('')
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    fetch('/api/agent-config')
      .then((r) => r.json())
      .then((d: any) => {
        if (d) {
          setPrompt(d?.prompt ?? '')
          setModel(d?.model ?? 'gpt-4o-mini')
          setActive(d?.active ?? true)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/agent-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model, active }),
      })
      if (res.ok) {
        toast.success('Configuração do agente salva!')
      } else {
        toast.error('Erro ao salvar')
      }
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!testMsg.trim()) return
    setTesting(true)
    setTestResponse('')
    try {
      const res = await fetch('/api/agent-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testMsg }),
      })

      if (!res.ok || !res.body) {
        toast.error('Erro ao testar agente')
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
              const content = parsed?.choices?.[0]?.delta?.content ?? ''
              if (content) setTestResponse((prev) => prev + content)
            } catch {}
          }
        }
      }
    } catch {
      toast.error('Erro ao testar agente')
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-[900px]">
      <FadeIn>
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold tracking-tight">Agente de IA</h1>
          <p className="text-muted-foreground mt-1">Configure o agente que responde automaticamente no WhatsApp</p>
        </div>
      </FadeIn>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  Configuração do Agente
                </CardTitle>
                <CardDescription className="mt-1">Defina o comportamento e o modelo de IA</CardDescription>
              </div>
              <Badge variant={active ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setActive(!active)}>
                <Power className="w-3 h-3 mr-1" />
                {active ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Modelo de IA</Label>
              <div className="flex flex-wrap gap-2">
                {MODELS.map((m) => (
                  <Button
                    key={m.id}
                    variant={model === m.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setModel(m.id)}
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    {m.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Prompt do Agente</Label>
              <Textarea
                value={prompt}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
                placeholder="Insira o prompt do agente..."
                className="min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Este prompt será usado pelo agente para responder mensagens no WhatsApp</p>
            </div>

            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Configuração
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Testar Agente
            </CardTitle>
            <CardDescription>Envie uma mensagem de teste e veja a resposta do agente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Digite uma mensagem de teste..."
                value={testMsg}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTestMsg(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleTest()}
                disabled={testing}
                className="flex-1"
              />
              <Button onClick={handleTest} disabled={testing || !testMsg.trim()}>
                {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Testar
              </Button>
            </div>
            {testResponse && (
              <div className="rounded-lg bg-muted p-4">
                <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                  <Bot className="w-4 h-4" /> Resposta do Agente:
                </div>
                <p className="text-sm whitespace-pre-wrap">{testResponse}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
