import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileDown,
  RefreshCw,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { SecaoMateriais } from '@/components/SecaoMateriais'
import { SecaoChat } from '@/components/SecaoChat'
import {
  buscarDocumento,
  ehErro,
  entregarAtividade,
  limparAtividade,
  urlPdf,
  type Atividade,
} from '@/lib/api'
import { RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  atividade: Atividade
  ocupado: boolean
  aoRegerarAtividade: () => void
  aoRevisar: () => void
  aoAtualizar?: () => void
}

// ─── Aba: documento markdown renderizado ────────────────────────────────────

function AbaDocumento({ pasta, doc }: { pasta: string; doc: string }) {
  const [html, setHtml] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let vivo = true
    setCarregando(true)
    buscarDocumento(pasta, doc).then((r) => {
      if (!vivo) return
      setHtml(ehErro(r) ? null : r.existe ? (r.html ?? '') : null)
      setCarregando(false)
    })
    return () => { vivo = false }
  }, [pasta, doc])

  if (carregando) {
    return (
      <div className="space-y-2 py-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    )
  }
  if (html === null) return <p className="text-sm text-muted-foreground py-2">Arquivo não encontrado.</p>

  return (
    <ScrollArea className="h-[calc(100svh-19rem)] min-h-[240px] rounded-lg border bg-muted/30 px-5">
      <div
        className="prose prose-sm dark:prose-invert max-w-none py-4 [&_img]:max-w-full [&_img]:rounded-md [&_img]:border"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </ScrollArea>
  )
}

// ─── Aba: pendências ─────────────────────────────────────────────────────────

function AbaPendencias({ pendencias }: { pendencias: string[] }) {
  return (
    <ul className="space-y-2">
      {pendencias.map((p, i) => (
        <li
          key={i}
          className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400"
        >
          {p}
        </li>
      ))}
    </ul>
  )
}

// ─── Aba: revisão enxuta ─────────────────────────────────────────────────────

function AbaRevisao({ pasta, veredito }: { pasta: string; veredito: Atividade['veredito'] }) {
  const [html, setHtml] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let vivo = true
    setCarregando(true)
    buscarDocumento(pasta, 'revisao').then((r) => {
      if (!vivo) return
      setHtml(ehErro(r) ? null : r.existe ? (r.html ?? '') : null)
      setCarregando(false)
    })
    return () => { vivo = false }
  }, [pasta])

  return (
    <div className="space-y-4">
      {/* Resumo compacto do veredito */}
      <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
        {veredito.desatualizada ? (
          <AlertTriangle className="size-4 shrink-0 text-amber-500" />
        ) : (
          <ShieldCheck className="size-4 shrink-0 text-emerald-500" />
        )}
        <span className="font-medium">{veredito.texto}</span>
        {veredito.data && (
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {new Date(veredito.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>

      {/* Comentários completos do revisor */}
      {carregando ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : html ? (
        <details className="group">
          <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
            Ver comentários completos do revisor
          </summary>
          <ScrollArea className="mt-2 h-[calc(100svh-26rem)] min-h-[180px] rounded-lg border bg-muted/30 px-5">
            <div
              className="prose prose-sm dark:prose-invert max-w-none py-4"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </ScrollArea>
        </details>
      ) : (
        <p className="text-sm text-muted-foreground">Sem comentários detalhados salvos.</p>
      )}
    </div>
  )
}

// ─── Botão entregar no Canvas ─────────────────────────────────────────────────

function BotaoEntregar({ atividade }: { atividade: Atividade }) {
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok' | 'erro'>('idle')
  const [msg, setMsg] = useState('')

  const entregar = async () => {
    const confirmar = window.confirm(
      `Enviar "${atividade.nome}" para o Canvas agora?\n\nO arquivo ${atividade.pdf ? 'PDF' : 'DOCX'} será submetido como entrega oficial.`
    )
    if (!confirmar) return

    setEstado('enviando')
    setMsg('')
    const r = await entregarAtividade(atividade.pasta)
    if (ehErro(r)) {
      setEstado('erro')
      setMsg(r.erro)
    } else {
      setEstado('ok')
      setMsg(`Entregue: ${r.arquivo}`)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        size="sm"
        variant={estado === 'ok' ? 'outline' : 'default'}
        disabled={(!atividade.pdf && !atividade.docx) || estado === 'enviando'}
        onClick={entregar}
        className={cn(estado === 'ok' && 'border-emerald-500 text-emerald-600 dark:text-emerald-400')}
      >
        {estado === 'enviando' ? (
          <RefreshCw className="size-3.5 animate-spin" />
        ) : estado === 'ok' ? (
          <CheckCircle2 className="size-3.5" />
        ) : (
          <Upload className="size-3.5" />
        )}
        {estado === 'enviando' ? 'Enviando…' : estado === 'ok' ? 'Entregue!' : 'Entregar no Canvas'}
      </Button>
      {msg && (
        <p className={cn('text-xs', estado === 'erro' ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400')}>
          {msg}
        </p>
      )}
    </div>
  )
}

// ─── Abas configuradas ────────────────────────────────────────────────────────

const ABAS: Array<{ chave: string; rotulo: (a: Atividade) => string; mostrar: (a: Atividade) => boolean }> = [
  { chave: 'atividade', rotulo: () => 'Atividade', mostrar: (a) => a.temRelatorio },
  { chave: 'pendencias', rotulo: (a) => `Pendências (${a.pendencias.length})`, mostrar: (a) => a.pendencias.length > 0 },
  { chave: 'revisao', rotulo: () => 'Revisão', mostrar: (a) => a.veredito.texto !== '—' },
  { chave: 'enunciado', rotulo: () => 'Enunciado', mostrar: (a) => a.temContexto },
]

// ─── Componente principal ─────────────────────────────────────────────────────

export function AtividadeDetalhe({ atividade, ocupado, aoRegerarAtividade, aoRevisar, aoAtualizar }: Props) {
  const abas = ABAS.filter((a) => a.mostrar(atividade))
  const [aba, setAba] = useState(abas[0]?.chave)

  return (
    <div className="space-y-5">
      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={!atividade.temRelatorio || ocupado} onClick={aoRegerarAtividade}>
          <RefreshCw className="size-3.5" />
          Regerar atividade
        </Button>
        <Button size="sm" variant="outline" disabled={!atividade.temRelatorio || ocupado} onClick={aoRevisar}>
          <ShieldCheck className="size-3.5" />
          Revisar de novo
        </Button>
        {atividade.pdf && (
          <Button size="sm" variant="outline" asChild>
            <a href={urlPdf(atividade.pasta)} target="_blank" rel="noreferrer">
              <FileDown className="size-3.5" />
              Abrir PDF
            </a>
          </Button>
        )}
        {atividade.link && (
          <Button size="sm" variant="ghost" asChild>
            <a href={atividade.link} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" />
              Canvas
            </a>
          </Button>
        )}
        <BotaoEntregar atividade={atividade} />
        {atividade.temRelatorio && (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            disabled={ocupado}
            onClick={async () => {
              const ok = window.confirm(
                `Deseja realmente limpar os arquivos gerados de "${atividade.nome}"?\n\nIsso apaga o relatório, PDF/DOCX e a revisão. O enunciado e os materiais serão mantidos.`
              )
              if (!ok) return
              const r = await limparAtividade(atividade.pasta)
              if (!ehErro(r)) {
                aoAtualizar?.()
              }
            }}
          >
            <RotateCcw className="size-3.5" />
            Limpar atividade
          </Button>
        )}
      </div>

      {atividade.desatualizado && (
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          A atividade foi editada depois do último .docx/.pdf gerado — regere antes de entregar.
        </p>
      )}

      {/* Abas de conteúdo */}
      {abas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nada coletado ainda para esta atividade.</p>
      ) : (
        <Tabs value={aba} onValueChange={setAba}>
          <TabsList>
            {abas.map((a) => (
              <TabsTrigger key={a.chave} value={a.chave}>
                {a.rotulo(atividade)}
              </TabsTrigger>
            ))}
          </TabsList>
          {abas.map((a) => (
            <TabsContent key={a.chave} value={a.chave}>
              {a.chave === 'pendencias' ? (
                <AbaPendencias pendencias={atividade.pendencias} />
              ) : a.chave === 'revisao' ? (
                <AbaRevisao pasta={atividade.pasta} veredito={atividade.veredito} />
              ) : (
                <AbaDocumento pasta={atividade.pasta} doc={a.chave === 'atividade' ? 'relatorio' : a.chave} />
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Materiais de contexto para o agente */}
      <SecaoMateriais pasta={atividade.pasta} />

      {/* Chat da atividade */}
      <SecaoChat pasta={atividade.pasta} aoAtualizar={aoAtualizar} />
    </div>
  )
}
