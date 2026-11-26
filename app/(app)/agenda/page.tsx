'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FadeIn } from '@/components/ui/animate'
import { Calendar, Clock, User, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react'
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Appointment {
  id: string
  date: string
  duration: number
  title: string
  synced: boolean
  lead: { name: string; phone: string }
}

// Schedule: continuous hour ranges [startHour, endHour] (endHour inclusive)
const SCHEDULE_RANGES: Record<number, [number, number]> = {
  1: [11, 16],  // Segunda 11h-16h
  2: [11, 16],  // Terça 11h-16h
  3: [8, 12],   // Quarta 8h-12h
  5: [8, 16],   // Sexta 8h-16h
}

function getHoursForDay(dayOfWeek: number): number[] {
  const range = SCHEDULE_RANGES[dayOfWeek]
  if (!range) return []
  const [start, end] = range
  const hours: number[] = []
  for (let h = start; h <= end; h++) {
    hours.push(h)
  }
  return hours
}

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState(() => {
    // SSR-safe: use a fixed epoch, then update on mount
    return startOfWeek(new Date(0), { weekStartsOn: 1 })
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
    setMounted(true)
  }, [])

  useEffect(() => {
    const from = weekStart.toISOString()
    const to = addDays(weekStart, 6).toISOString()
    fetch(`/api/appointments?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((d: any) => setAppointments(d ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [weekStart])

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="p-4 md:p-8 max-w-[1200px]">
      <FadeIn>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Agenda</h1>
            <p className="text-muted-foreground mt-1">Reuniões agendadas pelo agente de IA</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setWeekStart((w) => subWeeks(w, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[180px] text-center">
              {format(weekStart, "dd 'de' MMM", { locale: ptBR })} — {format(addDays(weekStart, 6), "dd 'de' MMM yyyy", { locale: ptBR })}
            </span>
            <Button variant="outline" size="icon" onClick={() => setWeekStart((w) => addWeeks(w, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dayOfWeek = day.getDay()
          const hours = getHoursForDay(dayOfWeek)
          const dayAppointments = (appointments ?? []).filter((a: Appointment) => {
            try { return isSameDay(new Date(a.date), day) } catch { return false }
          })
          const isToday = isSameDay(day, new Date())

          return (
            <Card key={day.toISOString()} className={`${isToday ? 'ring-2 ring-primary' : ''}`}>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {DAY_NAMES[dayOfWeek]}
                </CardTitle>
                <p className={`text-lg font-bold ${isToday ? 'text-primary' : ''}`}>
                  {format(day, 'dd')}
                </p>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                {hours.length === 0 ? (
                  <p className="text-xs text-muted-foreground opacity-50">Sem horário</p>
                ) : (
                  hours.map((hour: number) => {
                    const appt = dayAppointments.find((a: Appointment) => {
                      try { return new Date(a.date).getHours() === hour } catch { return false }
                    })
                    return (
                      <div
                        key={hour}
                        className={`rounded-lg p-2 text-xs ${
                          appt
                            ? 'bg-primary/10 border border-primary/20'
                            : 'bg-muted/50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <Clock className="w-3 h-3" />
                          <span className="font-mono font-medium">{String(hour).padStart(2, '0')}:00</span>
                        </div>
                        {appt ? (
                          <div>
                            <p className="font-medium flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {appt?.lead?.name ?? 'Lead'}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              {appt?.synced ? (
                                <Badge variant="outline" className="text-xs px-1 py-0 text-green-600 border-green-200">
                                  <CheckCircle2 className="w-3 h-3 mr-0.5" /> Sincronizado
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs px-1 py-0 text-amber-600 border-amber-200">
                                  <AlertCircle className="w-3 h-3 mr-0.5" /> Pendente
                                </Badge>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">Disponível</p>
                        )}
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
