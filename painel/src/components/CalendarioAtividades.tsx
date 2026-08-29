import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Atividade } from '@/lib/api'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const CORES_STATUS: Record<Atividade['status'], string> = {
  pronto: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  pendencia: 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  desatualizado: 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  'revisao-desatualizada': 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  reprovado: 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400',
  'aguardando-revisao': 'border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400',
  'sem-entrega': 'border-border bg-muted text-muted-foreground',
}

function chaveDia(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function gerarGradeMes(mesAtual: Date) {
  const ano = mesAtual.getFullYear()
  const mes = mesAtual.getMonth()
  const primeiroDia = new Date(ano, mes, 1)
  const ultimoDia = new Date(ano, mes + 1, 0)

  const inicio = new Date(primeiroDia)
  inicio.setDate(primeiroDia.getDate() - primeiroDia.getDay())
  const fim = new Date(ultimoDia)
  fim.setDate(ultimoDia.getDate() + (6 - ultimoDia.getDay()))

  const dias: Date[] = []
  for (const cursor = new Date(inicio); cursor <= fim; cursor.setDate(cursor.getDate() + 1)) {
    dias.push(new Date(cursor))
  }
  return dias
}

export function CalendarioAtividades({
  atividades,
  aoAbrir,
}: {
  atividades: Atividade[]
  aoAbrir: (a: Atividade) => void
}) {
  const [mesAtual, setMesAtual] = useState(() => new Date())

  const dias = useMemo(() => gerarGradeMes(mesAtual), [mesAtual])

  const porDia = useMemo(() => {
    const mapa = new Map<string, Atividade[]>()
    for (const a of atividades) {
      if (!a.prazo) continue
      const d = new Date(a.prazo)
      if (Number.isNaN(d.getTime())) continue
      const chave = chaveDia(d)
      if (!mapa.has(chave)) mapa.set(chave, [])
      mapa.get(chave)!.push(a)
    }
    return mapa
  }, [atividades])

  const hoje = new Date()
  const mesVisivel = mesAtual.getMonth()

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold capitalize">
          {mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMesAtual(new Date())}
          >
            Hoje
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={() => setMesAtual((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={() => setMesAtual((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="px-2 py-1.5 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-border">
          {dias.map((dia) => {
            const itens = porDia.get(chaveDia(dia)) || []
            const foraDoMes = dia.getMonth() !== mesVisivel
            const ehHoje = chaveDia(dia) === chaveDia(hoje)

            return (
              <div key={dia.toISOString()} className={cn('min-h-28 bg-card p-1.5', foraDoMes && 'bg-muted/20')}>
                <span
                  className={cn(
                    'inline-flex size-5 items-center justify-center rounded-full text-xs',
                    foraDoMes && 'text-muted-foreground/50',
                    ehHoje && 'bg-primary font-semibold text-primary-foreground'
                  )}
                >
                  {dia.getDate()}
                </span>
                <div className="mt-1 space-y-1">
                  {itens.map((a) => (
                    <button
                      key={a.pasta}
                      onClick={() => aoAbrir(a)}
                      title={a.nome}
                      className={cn(
                        'block w-full truncate rounded border px-1.5 py-0.5 text-left text-[11px] leading-tight hover:opacity-80',
                        CORES_STATUS[a.status],
                        a.status === 'pronto' && 'line-through opacity-60'
                      )}
                    >
                      {a.nome}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
