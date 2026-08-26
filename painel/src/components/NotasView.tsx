import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { buscarNotas, ehErro, type CursoNota, type Notas, type TarefaNota } from '@/lib/api'

function classeNota(nota: number | null, pontosPossiveis: number) {
  if (nota === null) return 'text-muted-foreground font-normal'
  const fracao = pontosPossiveis ? nota / pontosPossiveis : 0
  if (fracao >= 0.7) return 'text-emerald-600 dark:text-emerald-400 font-semibold'
  if (fracao >= 0.5) return 'text-amber-600 dark:text-amber-400 font-semibold'
  return 'text-red-600 dark:text-red-400 font-semibold'
}

function corNotaGeral(pontos: number | null) {
  if (pontos === null) return 'text-muted-foreground'
  if (pontos >= 70) return 'text-emerald-600 dark:text-emerald-400'
  if (pontos >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function formatarPrazo(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function LinhaTarefa({ t }: { t: TarefaNota }) {
  return (
    <TableRow>
      <TableCell className="max-w-0 truncate">{t.nome}</TableCell>
      <TableCell className="text-muted-foreground">{formatarPrazo(t.prazo)}</TableCell>
      <TableCell className={cn('text-right whitespace-nowrap', classeNota(t.nota, t.pontosPossiveis))}>
        {t.nota != null ? `${t.nota}/${t.pontosPossiveis}` : t.entregue ? 'aguardando' : '—'}
      </TableCell>
    </TableRow>
  )
}

function CardCurso({ curso }: { curso: CursoNota }) {
  const nota = curso.notaAtual.pontos

  return (
    <Card className="gap-4 py-4">
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 px-4">
        <span className="font-medium">{curso.materia}</span>
        <span className={cn('text-xl font-bold shrink-0', corNotaGeral(nota))}>
          {nota != null ? nota.toFixed(1) : '—'}
          {curso.notaAtual.letra && (
            <span className="ml-1 text-sm font-semibold text-muted-foreground">{curso.notaAtual.letra}</span>
          )}
        </span>
      </CardHeader>
      {curso.tarefas.length > 0 && (
        <CardContent className="px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Atividade</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead className="text-right">Nota</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {curso.tarefas.map((t, i) => (
                <LinhaTarefa key={i} t={t} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  )
}

export function NotasView() {
  const [notas, setNotas] = useState<Notas | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)

  const carregar = (forcar: boolean) => {
    setCarregando(true)
    setErro(null)
    buscarNotas(forcar).then((r) => {
      if (ehErro(r)) setErro(r.erro)
      else setNotas(r)
      setCarregando(false)
    })
  }

  useEffect(() => carregar(false), [])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" onClick={() => carregar(true)} disabled={carregando}>
          <RefreshCw className={cn('size-3.5', carregando && 'animate-spin')} />
          Atualizar notas
        </Button>
        {notas && (
          <span className="text-xs text-muted-foreground">
            atualizado {new Date(notas.atualizadoEm).toLocaleTimeString('pt-BR')}
          </span>
        )}
      </div>

      {carregando && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      )}

      {!carregando && erro && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <span>Não deu para buscar as notas: {erro}</span>
        </div>
      )}

      {!carregando && !erro && notas && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {notas.cursos.length === 0 ? (
            <p className="col-span-full py-16 text-center text-sm text-muted-foreground">
              Nenhum curso ativo encontrado.
            </p>
          ) : (
            notas.cursos.map((c) => <CardCurso key={c.cursoId} curso={c} />)
          )}
        </div>
      )}
    </div>
  )
}
