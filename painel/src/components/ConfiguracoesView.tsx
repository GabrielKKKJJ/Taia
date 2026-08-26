import { useEffect, useState } from 'react'
import {
  Bot,
  CheckCircle2,
  Cpu,
  Eye,
  EyeOff,
  Globe,
  Key,
  Loader2,
  Save,
  Sparkles,
  User,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  buscarConfiguracoes,
  ehErro,
  salvarConfiguracoes,
  testarConexaoCanvas,
  testarConexaoOpenRouter,
} from '@/lib/api'

const MODELOS_OPENROUTER = [
  { id: 'anthropic/claude-3.7-sonnet', nome: 'Claude 3.7 Sonnet (Anthropic via OpenRouter)' },
  { id: 'anthropic/claude-3.5-sonnet', nome: 'Claude 3.5 Sonnet' },
  { id: 'deepseek/deepseek-r1', nome: 'DeepSeek R1 (Raciocínio Avançado)' },
  { id: 'deepseek/deepseek-chat', nome: 'DeepSeek V3 (Chat)' },
  { id: 'google/gemini-2.0-flash-001', nome: 'Google Gemini 2.0 Flash' },
  { id: 'openai/gpt-4o', nome: 'OpenAI GPT-4o' },
  { id: 'meta-llama/llama-3.3-70b-instruct', nome: 'Meta Llama 3.3 70B' },
  { id: 'custom', nome: 'Outro Modelo Customizado…' },
]

export function ConfiguracoesView() {
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [testandoCanvas, setTestandoCanvas] = useState(false)
  const [testandoOpenRouter, setTestandoOpenRouter] = useState(false)

  // API Keys (.env)
  const [tokenCanvas, setTokenCanvas] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [openrouterKey, setOpenrouterKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')

  // Toggles de visibilidade de chaves
  const [mostraCanvas, setMostraCanvas] = useState(false)
  const [mostraAnthropic, setMostraAnthropic] = useState(false)
  const [mostraOpenAI, setMostraOpenAI] = useState(false)
  const [mostraOpenRouter, setMostraOpenRouter] = useState(false)
  const [mostraGemini, setMostraGemini] = useState(false)

  // Config do Agente
  const [aluno, setAluno] = useState('')
  const [provedor, setProvedor] = useState<'claude' | 'openrouter' | 'gemini' | 'custom'>('claude')
  const [comando, setComando] = useState('claude')

  const [modeloClaude, setModeloClaude] = useState('claude-3-7-sonnet')
  const [modeloOpenRouter, setModeloOpenRouter] = useState('anthropic/claude-3.7-sonnet')
  const [modeloCustomOpenRouter, setModeloCustomOpenRouter] = useState('')

  const [aceitarEdicoes, setAceitarEdicoes] = useState(true)
  const [flagsExtras, setFlagsExtras] = useState('')

  // Feedbacks
  const [msgSucesso, setMsgSucesso] = useState('')
  const [msgErro, setMsgErro] = useState('')
  const [msgCanvas, setMsgCanvas] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [msgOpenRouter, setMsgOpenRouter] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  useEffect(() => {
    setCarregando(true)
    buscarConfiguracoes().then((res) => {
      setCarregando(false)
      if (ehErro(res)) {
        setMsgErro(res.erro)
        return
      }
      setTokenCanvas(res.canvasToken || '')
      setAnthropicKey(res.anthropicKey || '')
      setOpenaiKey(res.openaiKey || '')
      setOpenrouterKey(res.openrouterKey || '')
      setGeminiKey(res.geminiKey || '')
      setAluno(res.aluno || '')

      if (res.agente) {
        setProvedor(res.agente.provedor || 'claude')
        setComando(res.agente.comando || 'claude')
        if (res.agente.modelo) {
          setModeloClaude(res.agente.modelo)
          if (MODELOS_OPENROUTER.some((m) => m.id === res.agente.modelo)) {
            setModeloOpenRouter(res.agente.modelo)
          } else {
            setModeloOpenRouter('custom')
            setModeloCustomOpenRouter(res.agente.modelo)
          }
        }
        setAceitarEdicoes(res.agente.flags?.includes('acceptEdits') ?? true)
        const flagsFilt = (res.agente.flags || []).filter(
          (f) => f !== '--permission-mode' && f !== 'acceptEdits'
        )
        setFlagsExtras(flagsFilt.join(' '))
      }
    })
  }, [])

  const aoSalvar = async () => {
    setSalvando(true)
    setMsgSucesso('')
    setMsgErro('')

    const flags: string[] = []
    if (aceitarEdicoes) {
      flags.push('--permission-mode', 'acceptEdits')
    }
    if (flagsExtras.trim()) {
      flags.push(...flagsExtras.trim().split(/\s+/))
    }

    const modeloFinal =
      provedor === 'openrouter'
        ? modeloOpenRouter === 'custom'
          ? modeloCustomOpenRouter.trim()
          : modeloOpenRouter
        : modeloClaude

    const res = await salvarConfiguracoes({
      canvasToken: tokenCanvas,
      anthropicKey,
      openaiKey,
      openrouterKey,
      geminiKey,
      aluno,
      agente: {
        provedor,
        comando,
        modelo: modeloFinal,
        flags,
        streamJson: true,
      },
    })

    setSalvando(false)
    if (ehErro(res)) {
      setMsgErro(res.erro)
    } else {
      setMsgSucesso('Todas as chaves e configurações foram salvas com sucesso!')
      setTimeout(() => setMsgSucesso(''), 4000)
    }
  }

  const aoTestarCanvas = async () => {
    setTestandoCanvas(true)
    setMsgCanvas(null)
    const res = await testarConexaoCanvas()
    setTestandoCanvas(false)
    if (ehErro(res)) {
      setMsgCanvas({ tipo: 'erro', texto: `Erro: ${res.erro}` })
    } else {
      setMsgCanvas({ tipo: 'ok', texto: `Conexão OK! ${res.totalCursos} curso(s) encontrado(s).` })
    }
  }

  const aoTestarOpenRouter = async () => {
    setTestandoOpenRouter(true)
    setMsgOpenRouter(null)
    const res = await testarConexaoOpenRouter()
    setTestandoOpenRouter(false)
    if (ehErro(res)) {
      setMsgOpenRouter({ tipo: 'erro', texto: `Erro: ${res.erro}` })
    } else {
      setMsgOpenRouter({
        tipo: 'ok',
        texto: `Chave OpenRouter Válida! Label: ${res.label || 'OK'}`,
      })
    }
  }

  if (carregando) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Carregando configurações…
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-8 py-2">
      {/* ─── Seção 1: Gerenciador Universal de API Keys (.env) ─── */}
      <section className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 border-b pb-3">
          <Key className="size-5 text-primary shrink-0" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Gerenciador de API Keys (.env)</h2>
            <p className="text-xs text-muted-foreground">
              Cole a chave da IA que você tem. O sistema usa qualquer API Key que você fornecer!
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Canvas Access Token */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Canvas Access Token (Jala University)</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={mostraCanvas ? 'text' : 'password'}
                  value={tokenCanvas}
                  onChange={(e) => setTokenCanvas(e.target.value)}
                  placeholder="Cole seu CANVAS_TOKEN aqui..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setMostraCanvas((v) => !v)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {mostraCanvas ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={aoTestarCanvas}
                disabled={testandoCanvas || !tokenCanvas}
                className="shrink-0 gap-1.5"
              >
                {testandoCanvas ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5 text-amber-500" />}
                Testar Canvas
              </Button>
            </div>
            {msgCanvas && (
              <p
                className={`text-xs ${
                  msgCanvas.tipo === 'ok' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-red-500'
                }`}
              >
                {msgCanvas.texto}
              </p>
            )}
          </div>

          {/* Anthropic API Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Anthropic API Key (<code className="font-mono text-[11px]">sk-ant-api03-...</code>)</span>
              <span className="text-[11px] font-normal text-muted-foreground">Para Claude oficial</span>
            </label>
            <div className="relative">
              <input
                type={mostraAnthropic ? 'text' : 'password'}
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setMostraAnthropic((v) => !v)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                {mostraAnthropic ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* OpenRouter API Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Globe className="size-3.5 text-indigo-500" /> OpenRouter Key (<code className="font-mono text-[11px]">sk-or-v1-...</code>)
              </span>
              <span className="text-[11px] font-normal text-muted-foreground">DeepSeek, GPT-4o, Gemini, Llama</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={mostraOpenRouter ? 'text' : 'password'}
                  value={openrouterKey}
                  onChange={(e) => setOpenrouterKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setMostraOpenRouter((v) => !v)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {mostraOpenRouter ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={aoTestarOpenRouter}
                disabled={testandoOpenRouter || !openrouterKey}
                className="shrink-0 gap-1.5"
              >
                {testandoOpenRouter ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5 text-indigo-500" />
                )}
                Testar Key
              </Button>
            </div>
            {msgOpenRouter && (
              <p
                className={`text-xs ${
                  msgOpenRouter.tipo === 'ok' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-red-500'
                }`}
              >
                {msgOpenRouter.texto}
              </p>
            )}
          </div>

          {/* OpenAI API Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>OpenAI API Key (<code className="font-mono text-[11px]">sk-proj-...</code>)</span>
              <span className="text-[11px] font-normal text-muted-foreground">Para OpenAI oficial</span>
            </label>
            <div className="relative">
              <input
                type={mostraOpenAI ? 'text' : 'password'}
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setMostraOpenAI((v) => !v)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                {mostraOpenAI ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Gemini API Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Google Gemini API Key (<code className="font-mono text-[11px]">AIzaSy...</code>)</span>
              <span className="text-[11px] font-normal text-muted-foreground">Para Gemini oficial</span>
            </label>
            <div className="relative">
              <input
                type={mostraGemini ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setMostraGemini((v) => !v)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                {mostraGemini ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Nome do Aluno */}
          <div className="space-y-1.5 pt-2 border-t">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <User className="size-3.5 text-muted-foreground" /> Nome do Aluno (Capa dos Trabalhos)
            </label>
            <input
              type="text"
              value={aluno}
              onChange={(e) => setAluno(e.target.value)}
              placeholder="Nome que aparecerá na capa do .docx"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      </section>

      {/* ─── Seção 2: Provedor & Modelo em Uso ─── */}
      <section className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 border-b pb-3">
          <Bot className="size-5 text-primary shrink-0" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Seleção do Agente e Provedor</h2>
            <p className="text-xs text-muted-foreground">
              Qual chave / serviço será utilizado ao disparar os relatórios e revisões.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Provedor de Execução</label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setProvedor('claude')}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 text-center transition-all ${
                  provedor === 'claude'
                    ? 'border-primary bg-primary/5 font-semibold text-primary'
                    : 'border-input hover:bg-muted text-muted-foreground'
                }`}
              >
                <Bot className="size-5" />
                <span className="text-xs">Claude / Anthropic</span>
              </button>

              <button
                type="button"
                onClick={() => setProvedor('openrouter')}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 text-center transition-all ${
                  provedor === 'openrouter'
                    ? 'border-indigo-500 bg-indigo-500/10 font-semibold text-indigo-600 dark:text-indigo-400'
                    : 'border-input hover:bg-muted text-muted-foreground'
                }`}
              >
                <Globe className="size-5 text-indigo-500" />
                <span className="text-xs">OpenRouter (Qualquer IA)</span>
              </button>

              <button
                type="button"
                onClick={() => setProvedor('custom')}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 text-center transition-all ${
                  provedor === 'custom'
                    ? 'border-primary bg-primary/5 font-semibold text-primary'
                    : 'border-input hover:bg-muted text-muted-foreground'
                }`}
              >
                <Cpu className="size-5" />
                <span className="text-xs">Comando Custom</span>
              </button>
            </div>
          </div>

          {provedor === 'openrouter' ? (
            <div className="space-y-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-indigo-500" /> Modelo OpenRouter
                </label>
                <select
                  value={modeloOpenRouter}
                  onChange={(e) => setModeloOpenRouter(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {MODELOS_OPENROUTER.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </div>

              {modeloOpenRouter === 'custom' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">ID do Modelo no OpenRouter</label>
                  <input
                    type="text"
                    value={modeloCustomOpenRouter}
                    onChange={(e) => setModeloCustomOpenRouter(e.target.value)}
                    placeholder="Ex: qwen/qwen-2.5-72b-instruct ou mistralai/mistral-large"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Comando CLI</label>
                <input
                  type="text"
                  value={comando}
                  onChange={(e) => setComando(e.target.value)}
                  placeholder="claude"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Cpu className="size-3.5 text-muted-foreground" /> Modelo
                </label>
                <select
                  value={modeloClaude}
                  onChange={(e) => setModeloClaude(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="claude-3-7-sonnet">Claude 3.7 Sonnet (Recomendado)</option>
                  <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                  <option value="claude-3-5-haiku">Claude 3.5 Haiku</option>
                  <option value="claude-3-opus">Claude 3 Opus</option>
                </select>
              </div>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={aceitarEdicoes}
                onChange={(e) => setAceitarEdicoes(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary"
              />
              <span className="text-xs text-foreground font-medium">
                Permitir edições automáticas em arquivos (<code className="font-mono text-[11px] bg-muted px-1 rounded">--permission-mode acceptEdits</code>)
              </span>
            </label>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Flags CLI Adicionais (opcional)</label>
              <input
                type="text"
                value={flagsExtras}
                onChange={(e) => setFlagsExtras(e.target.value)}
                placeholder="Ex: --verbose"
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mensagens de Sucesso / Erro */}
      {msgSucesso && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-4 shrink-0" />
          {msgSucesso}
        </div>
      )}
      {msgErro && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-500">
          {msgErro}
        </div>
      )}

      {/* Botão de Salvar */}
      <div className="flex justify-end pt-2">
        <Button onClick={aoSalvar} disabled={salvando} className="gap-2 px-6">
          {salvando ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {salvando ? 'Salvando…' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  )
}
