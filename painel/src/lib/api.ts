export type StatusAtividade =
  | 'pronto'
  | 'pendencia'
  | 'desatualizado'
  | 'revisao-desatualizada'
  | 'reprovado'
  | 'aguardando-revisao'
  | 'sem-entrega'

export interface Veredito {
  texto: string
  data: string | null
  desatualizada: boolean
}

export interface Atividade {
  materia: string
  pasta: string
  nome: string
  tipo: string | null
  semana: number | null
  prazo: string | null
  pontos: number | null
  link: string | null
  temContexto: boolean
  temRelatorio: boolean
  pdf: string | null
  docx: string | null
  arquivos: string[]
  veredito: Veredito
  pendencias: string[]
  desatualizado: boolean
  status: StatusAtividade
}

export interface Documento {
  existe: boolean
  bruto?: string
  html?: string
}

export interface TarefaNota {
  nome: string
  pontosPossiveis: number
  nota: number | null
  letra: string | null
  entregue: boolean
  prazo: string | null
}

export interface CursoNota {
  cursoId: string
  materia: string
  notaAtual: { pontos: number | null; letra: string | null }
  notaFinal: { pontos: number | null; letra: string | null }
  tarefas: TarefaNota[]
}

export interface Notas {
  atualizadoEm: string
  cursos: CursoNota[]
}

export interface ErroApi {
  erro: string
}

async function pedirJson<T>(url: string, init?: RequestInit): Promise<T | ErroApi> {
  try {
    const r = await fetch(url, init)
    if (!r.ok) {
      const texto = await r.text().catch(() => '')
      let json: any
      try { json = JSON.parse(texto) } catch {}
      return { erro: json?.erro || `Erro HTTP ${r.status}` }
    }
    return r.json()
  } catch (e: any) {
    return { erro: e?.message || 'Falha na conexão com o servidor' }
  }
}

export function buscarAtividades() {
  return pedirJson<{ atividades: Atividade[] }>('/api/atividades') as Promise<{ atividades: Atividade[] }>
}

export function buscarDocumento(pasta: string, doc: string) {
  const q = new URLSearchParams({ pasta, doc })
  return pedirJson<Documento | ErroApi>(`/api/documento?${q}`)
}

export function buscarNotas(forcar = false) {
  return pedirJson<Notas | ErroApi>(`/api/notas${forcar ? '?forcar=1' : ''}`)
}

export function urlPdf(pasta: string) {
  return `/api/pdf?${new URLSearchParams({ pasta })}`
}

export async function iniciarJob(script: string, args: string[] = []) {
  return pedirJson<{ id: string } | ErroApi>('/api/rodar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script, args }),
  })
}

export interface ResultadoEntrega {
  ok: boolean
  arquivo: string
  submissaoId: string | null
  url: string
}

export async function entregarAtividade(pasta: string) {
  return pedirJson<ResultadoEntrega | ErroApi>('/api/entregar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pasta }),
  })
}

export interface MensagemChat {
  role: 'user' | 'assistant'
  texto: string
  anexos?: string[]
  criadoEm: string
}

export function buscarChat(pasta: string) {
  return pedirJson<{ mensagens: MensagemChat[] } | ErroApi>(`/api/chat?${new URLSearchParams({ pasta })}`)
}

/** Dispara uma mensagem; a resposta vem via SSE em /api/chat/{id}/eventos. */
export async function enviarChat(pasta: string, texto: string, anexos?: string[]) {
  return pedirJson<{ id: string } | ErroApi>('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pasta, texto, anexos }),
  })
}

/** Sobe um anexo pro chat de uma atividade; devolve o nome salvo (com prefixo, evita colisão). */
export async function enviarAnexoChat(pasta: string, nome: string, buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  const CHUNK_SIZE = 0x8000
  let bin = ''
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK_SIZE) as unknown as number[])
  }
  return pedirJson<{ ok: boolean; nome: string } | ErroApi>('/api/chat/anexo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pasta, nome, conteudo: btoa(bin) }),
  })
}

export function urlAnexoChat(pasta: string, nome: string) {
  return `/api/chat/anexo?${new URLSearchParams({ pasta, nome })}`
}

export function ehErro(x: unknown): x is ErroApi {
  return !!x && typeof x === 'object' && 'erro' in x
}

// ── Materiais de contexto ─────────────────────────────────────────────────────

export interface ArquivoMaterial {
  nome: string
  tamanhoBytes: number
  modificadoEm: string
}

export function buscarMateriais(pasta: string) {
  return pedirJson<{ arquivos: ArquivoMaterial[] } | ErroApi>(`/api/materiais?${new URLSearchParams({ pasta })}`)
}

/** Envia um arquivo lido como ArrayBuffer. Converte para base64 em blocos para não travar a UI. */
export async function enviarMaterial(pasta: string, nome: string, buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  const CHUNK_SIZE = 0x8000 // 32KB
  let bin = ''
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK_SIZE) as unknown as number[])
  }
  const conteudo = btoa(bin)
  return pedirJson<{ ok: boolean; arquivo: ArquivoMaterial }>('/api/materiais', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pasta, nome, conteudo, base64: true }),
  })
}

/** Envia uma nota de texto puro (salva como .md). */
export async function enviarNotaMaterial(pasta: string, nome: string, texto: string) {
  return pedirJson<{ ok: boolean; arquivo: ArquivoMaterial } | ErroApi>('/api/materiais', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pasta, nome, conteudo: texto, base64: false }),
  })
}

export async function excluirMaterial(pasta: string, nome: string) {
  return pedirJson<{ ok: boolean } | ErroApi>('/api/materiais', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pasta, nome }),
  })
}

export async function limparAtividade(pasta: string) {
  return pedirJson<{ ok: boolean } | ErroApi>('/api/limpar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pasta }),
  })
}

// ── Configurações do Sistema ───────────────────────────────────────────────

export interface AgenteConfig {
  provedor?: 'claude' | 'openrouter' | 'gemini' | 'custom'
  comando: string
  modelo?: string
  flags: string[]
  streamJson?: boolean
}

export interface ConfigSistema {
  canvasToken: string
  anthropicKey?: string
  openaiKey?: string
  openrouterKey?: string
  geminiKey?: string
  aluno: string
  agente: AgenteConfig
  baseUrl: string
}

export function buscarConfiguracoes() {
  return pedirJson<ConfigSistema | ErroApi>('/api/configuracoes')
}

export function salvarConfiguracoes(dados: Partial<ConfigSistema>) {
  return pedirJson<{ ok: boolean } | ErroApi>('/api/configuracoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  })
}

export function testarConexaoCanvas() {
  return pedirJson<{ ok: boolean; totalCursos: number } | ErroApi>('/api/testar-canvas', {
    method: 'POST',
  })
}

export function testarConexaoOpenRouter() {
  return pedirJson<{ ok: boolean; label?: string; usage?: number } | ErroApi>('/api/testar-openrouter', {
    method: 'POST',
  })
}
