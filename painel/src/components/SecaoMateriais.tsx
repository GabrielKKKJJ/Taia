import { useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  File,
  FileCode,
  FileImage,
  FileText,
  Loader2,
  NotebookPen,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  buscarMateriais,
  ehErro,
  enviarMaterial,
  enviarNotaMaterial,
  excluirMaterial,
  type ArquivoMaterial,
} from '@/lib/api'


// ─── helpers ─────────────────────────────────────────────────────────────────

function iconeArquivo(nome: string) {
  const ext = nome.split('.').pop()?.toLowerCase() ?? ''
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext))
    return <FileImage className="size-3.5 text-violet-400 shrink-0" />
  if (['md', 'txt'].includes(ext))
    return <FileText className="size-3.5 text-blue-400 shrink-0" />
  if (['js', 'ts', 'py', 'java', 'cs', 'cpp', 'json', 'yaml', 'yml'].includes(ext))
    return <FileCode className="size-3.5 text-emerald-400 shrink-0" />
  return <File className="size-3.5 text-muted-foreground shrink-0" />
}

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ─── painel de nova nota ─────────────────────────────────────────────────────

function PainelNota({
  pasta,
  aoSalvar,
  aoFechar,
}: {
  pasta: string
  aoSalvar: (arq: ArquivoMaterial) => void
  aoFechar: () => void
}) {
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const salvar = async () => {
    const t = titulo.trim() || 'nota'
    const nome = t.endsWith('.md') ? t : `${t}.md`
    if (!texto.trim()) { setErro('Escreva algo antes de salvar.'); return }
    setEnviando(true)
    setErro('')
    const r = await enviarNotaMaterial(pasta, nome, texto)
    setEnviando(false)
    if (ehErro(r)) { setErro(r.erro); return }
    aoSalvar(r.arquivo)
    aoFechar()
  }

  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <NotebookPen className="size-3.5" /> Nova nota
        </span>
        <button onClick={aoFechar} className="text-muted-foreground hover:text-foreground">
          <X className="size-3.5" />
        </button>
      </div>
      <input
        type="text"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Nome do arquivo (ex: entrega-parcial)"
        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) salvar() }}
        placeholder="Cole aqui o texto, relatório parcial, instruções extras… (Ctrl+Enter para salvar)"
        className="min-h-[120px] resize-y text-sm"
        autoFocus
      />
      {erro && <p className="text-xs text-red-500">{erro}</p>}
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={aoFechar}>Cancelar</Button>
        <Button size="sm" onClick={salvar} disabled={enviando}>
          {enviando ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Salvar nota
        </Button>
      </div>
    </div>
  )
}

// ─── componente principal ─────────────────────────────────────────────────────

interface Props {
  pasta: string
}

export function SecaoMateriais({ pasta }: Props) {
  const [expandido, setExpandido] = useState(false)
  const [arquivos, setArquivos] = useState<ArquivoMaterial[]>([])
  const [carregando, setCarregando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [mostraNota, setMostraNota] = useState(false)
  const [erroBanner, setErroBanner] = useState('')
  const inputFileRef = useRef<HTMLInputElement>(null)

  // Carrega lista quando expande pela primeira vez
  useEffect(() => {
    if (!expandido) return
    setCarregando(true)
    buscarMateriais(pasta).then((r) => {
      if (!ehErro(r)) setArquivos(r.arquivos)
      setCarregando(false)
    })
  }, [pasta, expandido])


  // Upload de arquivo real (qualquer tipo)
  const aoSelecionarArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivosSel = Array.from(e.target.files ?? [])
    if (!arquivosSel.length) return
    setEnviando(true)
    setErroBanner('')

    try {
      for (const arq of arquivosSel) {
        const buffer = await arq.arrayBuffer()
        const r = await enviarMaterial(pasta, arq.name, buffer)
        if (ehErro(r)) {
          setErroBanner(`Erro ao enviar "${arq.name}": ${r.erro}`)
        } else {
          setArquivos((prev) => {
            const sem = prev.filter((a) => a.nome !== r.arquivo.nome)
            return [...sem, r.arquivo].sort((a, b) => a.nome.localeCompare(b.nome))
          })
        }
      }
    } catch (err: any) {
      setErroBanner(`Falha ao processar arquivo: ${err?.message || err}`)
    } finally {
      setEnviando(false)
      if (inputFileRef.current) inputFileRef.current.value = ''
    }
  }

  const excluir = async (nome: string) => {
    if (!window.confirm(`Remover "${nome}" dos materiais?`)) return
    await excluirMaterial(pasta, nome)
    setArquivos((prev) => prev.filter((a) => a.nome !== nome))
  }

  const aoNovaNota = (arq: ArquivoMaterial) => {
    setArquivos((prev) => {
      const sem = prev.filter((a) => a.nome !== arq.nome)
      return [...sem, arq].sort((a, b) => a.nome.localeCompare(b.nome))
    })
  }

  return (
    <div className="rounded-lg border bg-card">
      {/* Cabeçalho clicável */}
      <button
        onClick={() => setExpandido((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors rounded-lg"
      >
        <BookOpen className="size-3.5 text-muted-foreground shrink-0" />
        <span className="flex-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Contexto / Materiais
        </span>
        {arquivos.length > 0 && !expandido && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {arquivos.length}
          </span>
        )}
        {expandido ? (
          <ChevronDown className="size-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 text-muted-foreground" />
        )}
      </button>

      {expandido && (
        <div className="border-t px-3 pb-3 pt-2 space-y-3">
          {/* Explicação */}
          <p className="text-xs text-muted-foreground">
            Arquivos aqui ficam em <code className="font-mono text-[10px] bg-muted px-1 rounded">_contexto/materiais/</code> e são lidos pelo agente ao gerar ou revisar a atividade.
            Ideal para: entregas anteriores, instruções extras, código de referência, PDFs.
          </p>

          {/* Lista */}
          {carregando ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
              <Loader2 className="size-3.5 animate-spin" /> Carregando…
            </div>
          ) : arquivos.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Nenhum material adicionado ainda.</p>
          ) : (
            <ul className="divide-y rounded-md border overflow-hidden">
              {arquivos.map((arq) => (
                <li key={arq.nome} className="flex items-center gap-2 px-2.5 py-2 hover:bg-muted/20 group">
                  {iconeArquivo(arq.nome)}
                  <span className="flex-1 min-w-0 truncate text-sm">{arq.nome}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatarTamanho(arq.tamanhoBytes)}
                  </span>
                  <button
                    onClick={() => excluir(arq.nome)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity ml-1"
                    title="Remover"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Erro */}
          {erroBanner && (
            <p className="text-xs text-red-500">{erroBanner}</p>
          )}

          {/* Painel de nota inline */}
          {mostraNota && (
            <PainelNota
              pasta={pasta}
              aoSalvar={aoNovaNota}
              aoFechar={() => setMostraNota(false)}
            />
          )}

          {/* Ações */}
          {!mostraNota && (
            <div className="flex flex-wrap gap-2">
              {/* Upload de arquivo */}
              <Button
                size="sm"
                variant="outline"
                disabled={enviando}
                onClick={() => inputFileRef.current?.click()}
                className="gap-1.5"
              >
                {enviando ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                {enviando ? 'Enviando…' : 'Enviar arquivo'}
              </Button>
              <input
                ref={inputFileRef}
                type="file"
                multiple
                className="hidden"
                onChange={aoSelecionarArquivo}
                accept=".md,.txt,.pdf,.docx,.png,.jpg,.jpeg,.gif,.webp,.json,.yaml,.yml,.js,.ts,.py,.java,.cs,.cpp,.html,.css"
              />

              {/* Nova nota de texto */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMostraNota(true)}
                className="gap-1.5"
              >
                <Plus className="size-3.5" />
                Nova nota
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
