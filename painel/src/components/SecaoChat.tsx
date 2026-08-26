import { useEffect, useRef, useState } from 'react'
import { Bot, FileText, Loader2, Paperclip, Send, User, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { buscarChat, ehErro, enviarAnexoChat, enviarChat, urlAnexoChat, type MensagemChat } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Bolha extends MensagemChat {
  streaming?: boolean
}

const EXT_IMAGEM = /\.(png|jpe?g|gif|webp)$/i

function nomeSemPrefixo(nome: string) {
  // anexos sao salvos como "<timestamp>-<nome original>" pra nao colidir.
  return nome.replace(/^\d+-/, '')
}

function AnexoChip({ pasta, nome, aoRemover }: { pasta: string; nome: string; aoRemover?: () => void }) {
  const imagem = EXT_IMAGEM.test(nome)
  return (
    <a
      href={urlAnexoChat(pasta, nome)}
      target="_blank"
      rel="noreferrer"
      className="group relative flex items-center gap-1.5 rounded-lg border bg-background px-2 py-1 text-xs hover:border-primary/40"
    >
      {imagem ? (
        <img src={urlAnexoChat(pasta, nome)} alt={nomeSemPrefixo(nome)} className="size-8 rounded object-cover" />
      ) : (
        <FileText className="size-4 shrink-0 text-muted-foreground" />
      )}
      <span className="max-w-32 truncate">{nomeSemPrefixo(nome)}</span>
      {aoRemover && (
        <button
          onClick={(e) => {
            e.preventDefault()
            aoRemover()
          }}
          className="ml-1 rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="size-3" />
        </button>
      )}
    </a>
  )
}

function Bubble({ pasta, bolha }: { pasta: string; bolha: Bolha }) {
  const souUsuario = bolha.role === 'user'
  return (
    <div className={cn('flex gap-2', souUsuario && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full',
          souUsuario ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}
      >
        {souUsuario ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
      </div>
      <div className={cn('flex max-w-[85%] flex-col gap-1.5', souUsuario && 'items-end')}>
        {!!bolha.anexos?.length && (
          <div className="flex flex-wrap gap-1.5">
            {bolha.anexos.map((n) => (
              <AnexoChip key={n} pasta={pasta} nome={n} />
            ))}
          </div>
        )}
        {(bolha.texto || bolha.streaming) && (
          <div
            className={cn(
              'rounded-xl px-3 py-2 text-sm whitespace-pre-wrap',
              souUsuario ? 'bg-primary text-primary-foreground' : 'bg-muted'
            )}
          >
            {bolha.texto || '…'}
          </div>
        )}
      </div>
    </div>
  )
}

export function SecaoChat({ pasta, aoAtualizar }: { pasta: string; aoAtualizar?: () => void }) {
  const [mensagens, setMensagens] = useState<Bolha[]>([])
  const [texto, setTexto] = useState('')
  const [pendentes, setPendentes] = useState<string[]>([])
  const [enviandoAnexo, setEnviandoAnexo] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const fimRef = useRef<HTMLDivElement>(null)
  const inputArquivoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    buscarChat(pasta).then((r) => {
      if (!ehErro(r)) setMensagens(r.mensagens)
    })
  }, [pasta])

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: 'end' })
  }, [mensagens.length, mensagens[mensagens.length - 1]?.texto, status, pendentes.length])

  const atualizarUltima = (fn: (b: Bolha) => Bolha) => {
    setMensagens((m) => {
      if (!m.length) return m
      const copia = [...m]
      copia[copia.length - 1] = fn(copia[copia.length - 1])
      return copia
    })
  }

  const escolherArquivos = async (arquivos: FileList | null) => {
    if (!arquivos?.length) return
    setEnviandoAnexo(true)
    setErro(null)
    for (const arquivo of Array.from(arquivos)) {
      const buffer = await arquivo.arrayBuffer()
      const r = await enviarAnexoChat(pasta, arquivo.name, buffer)
      if (ehErro(r)) setErro(r.erro)
      else setPendentes((p) => [...p, r.nome])
    }
    setEnviandoAnexo(false)
    if (inputArquivoRef.current) inputArquivoRef.current.value = ''
  }

  const enviar = async () => {
    const msg = texto.trim()
    if ((!msg && !pendentes.length) || enviando) return

    const anexosDaMensagem = pendentes
    setTexto('')
    setPendentes([])
    setErro(null)
    setEnviando(true)
    setMensagens((m) => [
      ...m,
      { role: 'user', texto: msg, anexos: anexosDaMensagem.length ? anexosDaMensagem : undefined, criadoEm: '' },
      { role: 'assistant', texto: '', criadoEm: '', streaming: true },
    ])

    const r = await enviarChat(pasta, msg, anexosDaMensagem.length ? anexosDaMensagem : undefined)
    if (ehErro(r)) {
      setErro(r.erro)
      setEnviando(false)
      atualizarUltima((b) => ({ ...b, texto: 'Não deu para responder — veja o erro acima.', streaming: false }))
      return
    }

    const es = new EventSource(`/api/chat/${r.id}/eventos`)
    es.addEventListener('texto', (ev) => {
      const pedaco = JSON.parse((ev as MessageEvent).data) as string
      setStatus(null)
      atualizarUltima((b) => ({ ...b, texto: b.texto + pedaco }))
    })
    es.addEventListener('status', (ev) => {
      setStatus(JSON.parse((ev as MessageEvent).data))
    })
    es.addEventListener('fim', () => {
      setStatus(null)
      setEnviando(false)
      atualizarUltima((b) => ({ ...b, streaming: false }))
      es.close()
      aoAtualizar?.()
    })
    es.onerror = () => {
      setStatus(null)
      setEnviando(false)
      es.close()
    }
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-3 py-2">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Chat da atividade</span>
      </div>

      <div className="max-h-80 space-y-3 overflow-y-auto p-3">
        {mensagens.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Pergunte algo, peça uma correção ou anexe um print/arquivo — ele responde ou edita o relatório direto, na hora.
          </p>
        )}
        {mensagens.map((m, i) => (
          <Bubble key={i} pasta={pasta} bolha={m} />
        ))}
        {status && (
          <div className="flex items-center gap-1.5 pl-8 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            {status}
          </div>
        )}
        <div ref={fimRef} />
      </div>

      {erro && <p className="border-t px-3 py-2 text-xs text-red-600 dark:text-red-400">{erro}</p>}

      {pendentes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t px-3 pt-2">
          {pendentes.map((n) => (
            <AnexoChip key={n} pasta={pasta} nome={n} aoRemover={() => setPendentes((p) => p.filter((x) => x !== n))} />
          ))}
        </div>
      )}

      <div className={cn('flex gap-2 p-3', pendentes.length === 0 && 'border-t')}>
        <input
          ref={inputArquivoRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => escolherArquivos(e.target.files)}
        />
        <Button
          size="icon"
          variant="outline"
          disabled={enviandoAnexo || enviando}
          onClick={() => inputArquivoRef.current?.click()}
          className="shrink-0 self-end"
          title="Anexar arquivo"
        >
          {enviandoAnexo ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
        </Button>
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              enviar()
            }
          }}
          placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para quebrar linha)"
          className="min-h-[44px] resize-none text-sm"
          disabled={enviando}
        />
        <Button size="icon" disabled={(!texto.trim() && !pendentes.length) || enviando} onClick={enviar} className="shrink-0 self-end">
          {enviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
    </div>
  )
}
