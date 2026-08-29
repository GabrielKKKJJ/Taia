import { useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/StatusBadge'
import { AtividadeSheet } from '@/components/AtividadeSheet'
import { CalendarioAtividades } from '@/components/CalendarioAtividades'
import { cn } from '@/lib/utils'
import type { Atividade } from '@/lib/api'

interface Props {
  atividades: Atividade[]
  carregando: boolean
  ocupado: boolean
  aoRegerarAtividade: (a: Atividade) => void
  aoRevisar: (a: Atividade) => void
  aoAtualizar?: () => void
}

function formatarPrazo(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null

  const diasRestantes = Math.round((d.getTime() - Date.now()) / 86_400_000)
  const texto = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const urgencia = diasRestantes < 0 ? 'atrasado' : diasRestantes <= 2 ? 'proximo' : 'normal'
  return { texto, urgencia }
}

function CardAtividade({ atividade, aoAbrir }: { atividade: Atividade; aoAbrir: () => void }) {
  const prazo = formatarPrazo(atividade.prazo)

  return (
    <button
      onClick={aoAbrir}
      className="group flex h-full flex-col gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <StatusBadge status={atividade.status} />
        {prazo && (
          <span
            className={cn(
              'shrink-0 text-xs font-medium',
              prazo.urgencia === 'atrasado' && 'text-red-600 dark:text-red-400',
              prazo.urgencia === 'proximo' && 'text-amber-600 dark:text-amber-400',
              prazo.urgencia === 'normal' && 'text-muted-foreground'
            )}
          >
            {prazo.texto}
          </span>
        )}
      </div>

      <h3 className="line-clamp-2 text-sm leading-snug font-medium text-foreground group-hover:text-primary">
        {atividade.nome}
      </h3>

      {atividade.pendencias.length > 0 && (
        <span className="mt-auto inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="size-3.5" />
          {atividade.pendencias.length} pendência{atividade.pendencias.length > 1 ? 's' : ''}
        </span>
      )}
    </button>
  )
}

export function AtividadesView({
  atividades,
  carregando,
  ocupado,
  aoRegerarAtividade,
  aoRevisar,
  aoAtualizar,
}: Props) {
  const [selecionada, setSelecionada] = useState<Atividade | null>(null)
  const [sheetAberto, setSheetAberto] = useState(false)
  const [visao, setVisao] = useState<'lista' | 'calendario'>('calendario')

  const abrir = (a: Atividade) => {
    setSelecionada(a)
    setSheetAberto(true)
  }

  const porMateria = useMemo(() => {
    const mapa = new Map<string, Atividade[]>()
    for (const a of atividades) {
      if (!mapa.has(a.materia)) mapa.set(a.materia, [])
      mapa.get(a.materia)!.push(a)
    }
    return [...mapa.entries()]
  }, [atividades])

  // Mantem a folha aberta em sincronia se a lista recarregar (status muda apos rodar uma acao).
  const atual = selecionada ? atividades.find((a) => a.pasta === selecionada.pasta) ?? selecionada : null

  if (carregando) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (!atividades.length) {
    return (
      <p className="text-sm text-muted-foreground py-16 text-center">
        Nenhuma atividade em entregas/. Clique em "Coletar do Canvas" para buscar as da semana.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-1">
        <Button size="sm" variant={visao === 'lista' ? 'secondary' : 'ghost'} onClick={() => setVisao('lista')}>
          <LayoutGrid className="size-3.5" />
          Lista
        </Button>
        <Button size="sm" variant={visao === 'calendario' ? 'secondary' : 'ghost'} onClick={() => setVisao('calendario')}>
          <CalendarDays className="size-3.5" />
          Calendário
        </Button>
      </div>

      {visao === 'calendario' ? (
        <CalendarioAtividades atividades={atividades} aoAbrir={abrir} />
      ) : (
        <div className="space-y-8">
          {porMateria.map(([materia, lista]) => {
            const prontas = lista.filter((a) => a.status === 'pronto').length
            return (
              <section key={materia} className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{materia}</h2>
                  <span className="text-xs text-muted-foreground">
                    {prontas}/{lista.length} prontas
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {lista.map((a) => (
                    <CardAtividade key={a.pasta} atividade={a} aoAbrir={() => abrir(a)} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <AtividadeSheet
        atividade={atual}
        aberto={sheetAberto}
        ocupado={ocupado}
        onOpenChange={setSheetAberto}
        aoRegerarAtividade={aoRegerarAtividade}
        aoRevisar={aoRevisar}
        aoAtualizar={aoAtualizar}
      />
    </div>
  )
}
