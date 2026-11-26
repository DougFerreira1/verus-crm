'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, MessageSquare, Calendar, Bot, TrendingUp, ArrowRight, RefreshCw } from 'lucide-react'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/animate'
import Link from 'next/link'

interface Stats {
  totalLeads: number
  novoLead: number
  emAtendimento: number
  agendado: number
  conversasAtivas: number
  reunioesEstaSemana: number
  mensagensAgente: number
  followUpsEnviados: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((d: any) => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const kpis = [
    { label: 'Total de Leads', value: stats?.totalLeads ?? 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', href: '/kanban' },
    { label: 'Novo Lead', value: stats?.novoLead ?? 0, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50', href: '/kanban' },
    { label: 'Em Atendimento', value: stats?.emAtendimento ?? 0, icon: MessageSquare, color: 'text-amber-500', bg: 'bg-amber-50', href: '/kanban' },
    { label: 'Agendado', value: stats?.agendado ?? 0, icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-50', href: '/agenda' },
    { label: 'Conversas Ativas', value: stats?.conversasAtivas ?? 0, icon: MessageSquare, color: 'text-green-500', bg: 'bg-green-50', href: '/conversas' },
    { label: 'Reuniões na Semana', value: stats?.reunioesEstaSemana ?? 0, icon: Calendar, color: 'text-indigo-500', bg: 'bg-indigo-50', href: '/agenda' },
    { label: 'Respostas do Agente', value: stats?.mensagensAgente ?? 0, icon: Bot, color: 'text-pink-500', bg: 'bg-pink-50', href: '/agente' },
    { label: 'Follow-ups Enviados', value: stats?.followUpsEnviados ?? 0, icon: RefreshCw, color: 'text-orange-500', bg: 'bg-orange-50', href: '/configuracoes' },
  ]

  return (
    <div className="p-4 md:p-8 max-w-[1200px]">
      <FadeIn>
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight">Painel</h1>
          <p className="text-muted-foreground mt-1">Visão geral do Verus CRM</p>
        </div>
      </FadeIn>

      <Stagger staggerDelay={0.08}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <StaggerItem key={kpi.label}>
              <Link href={kpi.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                        <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-2xl font-bold font-mono">
                      {loading ? '—' : kpi.value}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{kpi.label}</p>
                  </CardContent>
                </Card>
              </Link>
            </StaggerItem>
          ))}
        </div>
      </Stagger>

      <FadeIn delay={0.4}>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                Agente de IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Configure o prompt e o modelo do agente que responde automaticamente no WhatsApp.
              </p>
              <Link href="/agente" className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
                Configurar Agente <ArrowRight className="w-4 h-4" />
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Simulador WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Teste o agente de IA enviando mensagens simuladas antes de conectar o WhatsApp real.
              </p>
              <Link href="/configuracoes" className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
                Ir para Configurações <ArrowRight className="w-4 h-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </FadeIn>
    </div>
  )
}
