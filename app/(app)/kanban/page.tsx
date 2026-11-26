'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FadeIn } from '@/components/ui/animate'
import { Users, Phone, Clock, MessageSquare, Bot, GripVertical, Tag, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface TagType {
  id: string
  name: string
  color: string
}

interface Lead {
  id: string
  name: string
  phone: string
  stage: string
  origin: string
  autoMoved: boolean
  aiHandled: boolean
  tagId: string | null
  tag: TagType | null
  lastMessageAt: string | null
  lastFollowUpAt: string | null
  followUpCount: number
  createdAt: string
  conversations: { lastMsg: string | null; unread: number }[]
}

const STAGES = [
  { id: 'novo_lead', label: 'Novo Lead', color: 'bg-blue-500', lightBg: 'bg-blue-50', borderColor: 'border-blue-200' },
  { id: 'em_atendimento', label: 'Em Atendimento', color: 'bg-amber-500', lightBg: 'bg-amber-50', borderColor: 'border-amber-200' },
  { id: 'agendado', label: 'Agendado', color: 'bg-green-500', lightBg: 'bg-green-50', borderColor: 'border-green-200' },
]

export default function KanbanPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [tags, setTags] = useState<TagType[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [openTagMenu, setOpenTagMenu] = useState<string | null>(null)
  const tagMenuRef = useRef<HTMLDivElement>(null)

  const fetchLeads = useCallback(() => {
    fetch('/api/leads')
      .then((r) => r.json())
      .then((d: any) => setLeads(d ?? []))
      .catch(() => toast.error('Erro ao carregar leads'))
      .finally(() => setLoading(false))
  }, [])

  const fetchTags = useCallback(() => {
    fetch('/api/tags')
      .then((r) => r.json())
      .then((d: any) => setTags(d ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchLeads()
    fetchTags()
    const interval = setInterval(fetchLeads, 10000)
    return () => clearInterval(interval)
  }, [fetchLeads, fetchTags])

  // Close tag menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tagMenuRef.current && !tagMenuRef.current.contains(e.target as Node)) {
        setOpenTagMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedId(leadId)
    e.dataTransfer.setData('text/plain', leadId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault()
    const leadId = e.dataTransfer.getData('text/plain')
    if (!leadId) return
    setDraggedId(null)

    setLeads((prev) =>
      (prev ?? []).map((l: Lead) =>
        l.id === leadId ? { ...l, stage: newStage, autoMoved: false } : l
      )
    )

    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage, autoMoved: false }),
      })
    } catch {
      toast.error('Erro ao mover lead')
      fetchLeads()
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const changeTag = async (leadId: string, tagId: string) => {
    setOpenTagMenu(null)
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, tagId, tag: tags.find((t) => t.id === tagId) ?? null }
          : l
      )
    )
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId }),
      })
      toast.success('Tag alterada')
    } catch {
      toast.error('Erro ao alterar tag')
      fetchLeads()
    }
  }

  const getTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return ''
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR })
    } catch {
      return ''
    }
  }

  return (
    <div className="p-4 md:p-8">
      <FadeIn>
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold tracking-tight">Kanban</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus leads arrastando entre as colunas</p>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[70vh]">
        {STAGES.map((stage) => {
          const stageLeads = (leads ?? []).filter((l: Lead) => l?.stage === stage.id)
          return (
            <div
              key={stage.id}
              className={`rounded-xl border ${stage.borderColor} ${stage.lightBg} p-3 transition-colors`}
              onDragOver={handleDragOver}
              onDrop={(e: React.DragEvent) => handleDrop(e, stage.id)}
            >
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                <h2 className="font-display font-semibold text-sm">{stage.label}</h2>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {stageLeads?.length ?? 0}
                </Badge>
              </div>

              <div className="space-y-2 min-h-[200px]">
                {loading ? (
                  <div className="text-sm text-muted-foreground text-center py-8">Carregando...</div>
                ) : (stageLeads?.length ?? 0) === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8 opacity-60">
                    Nenhum lead
                  </div>
                ) : (
                  (stageLeads ?? []).map((lead: Lead) => (
                    <Card
                      key={lead.id}
                      draggable
                      onDragStart={(e: React.DragEvent) => handleDragStart(e, lead.id)}
                      className={`cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${
                        draggedId === lead.id ? 'opacity-50 scale-95' : ''
                      }`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{lead?.name ?? 'Sem nome'}</p>
                              {lead?.autoMoved && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0 border-primary/30 text-primary">
                                  <Bot className="w-3 h-3 mr-0.5" /> auto
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              <span>{lead?.phone ?? ''}</span>
                            </div>
                            {lead?.conversations?.[0]?.lastMsg && (
                              <p className="text-xs text-muted-foreground mt-1.5 truncate">
                                <MessageSquare className="w-3 h-3 inline mr-1" />
                                {lead.conversations[0].lastMsg}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-2 gap-1">
                              {/* Tag badge with dropdown */}
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setOpenTagMenu(openTagMenu === lead.id ? null : lead.id)
                                  }}
                                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors hover:bg-muted"
                                  style={{
                                    borderColor: lead.tag?.color ?? '#d1d5db',
                                    color: lead.tag?.color ?? '#6b7280',
                                  }}
                                >
                                  <Tag className="w-3 h-3" />
                                  {lead.tag?.name ?? 'Sem tag'}
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                                {openTagMenu === lead.id && (
                                  <div
                                    ref={tagMenuRef}
                                    className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[160px] py-1"
                                  >
                                    {tags.map((t) => (
                                      <button
                                        key={t.id}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          changeTag(lead.id, t.id)
                                        }}
                                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-muted transition-colors ${
                                          lead.tagId === t.id ? 'font-semibold bg-muted/50' : ''
                                        }`}
                                      >
                                        <span
                                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                          style={{ backgroundColor: t.color }}
                                        />
                                        {t.name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {lead?.lastMessageAt && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {getTimeAgo(lead.lastMessageAt)}
                                </span>
                              )}
                            </div>
                            {lead.followUpCount > 0 && (
                              <div className="mt-1.5 text-xs text-orange-600 flex items-center gap-1">
                                <Bot className="w-3 h-3" />
                                {lead.followUpCount} follow-up{lead.followUpCount > 1 ? 's' : ''} enviado{lead.followUpCount > 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
