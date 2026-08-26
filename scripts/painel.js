'use strict';
/**
 * Painel web local: mostra o estado de cada atividade (coletada, com
 * pendencia, revisada, pronta) e permite disparar coletar/relatorio/resumo
 * sem abrir o terminal.
 *
 * So local: o servidor escuta em 127.0.0.1, nunca em 0.0.0.0.
 *
 * Uso:
 *   node scripts/painel.js
 *   node scripts/painel.js --porta 5050
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { statusDaAtividade } = require('./lib/status');
const { carregarEnv, materiaDe } = require('./lib/util');
const { Canvas } = require('./lib/canvas');

const RAIZ = path.resolve(__dirname, '..');
carregarEnv(RAIZ);
const cfg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'config.json'), 'utf8'));

const argv = process.argv.slice(2);
const arg = (nome, padrao) => {
  const i = argv.indexOf(`--${nome}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : padrao;
};
const PORTA = Number(arg('porta', process.env.PORTA || 4848));

const PASTA_ENTREGAS = path.resolve(RAIZ, cfg.pastaEntregas);
const PADRAO_PASTA = /^(Lab|Tarefa|Projeto|Question[aá]rio)\s+Semana\s+(\d+)(?:\s*-\s*(.+))?$/i;

// ---------------------------------------------------------------- atividades

/** Acha o primeiro arquivo com a extensao dada dentro de entrega/. */
function acharPorExtensao(pastaAbs, ext) {
  const dir = path.join(pastaAbs, 'entrega');
  if (!fs.existsSync(dir)) return null;
  const achado = fs.readdirSync(dir).find((f) => f.toLowerCase().endsWith(ext));
  return achado ? path.join(dir, achado) : null;
}

function lerMeta(pastaAbs) {
  const arq = path.join(pastaAbs, '_contexto', 'meta.json');
  if (!fs.existsSync(arq)) return null;
  try { return JSON.parse(fs.readFileSync(arq, 'utf8')); } catch { return null; }
}

function listarAtividades() {
  if (!fs.existsSync(PASTA_ENTREGAS)) return [];
  const atividades = [];

  for (const materia of fs.readdirSync(PASTA_ENTREGAS, { withFileTypes: true })) {
    if (!materia.isDirectory()) continue;
    const dirMateria = path.join(PASTA_ENTREGAS, materia.name);

    for (const pasta of fs.readdirSync(dirMateria, { withFileTypes: true })) {
      if (!pasta.isDirectory()) continue;
      const pastaAbs = path.join(dirMateria, pasta.name);
      const pastaRel = path.relative(RAIZ, pastaAbs).replace(/\\/g, '/');

      const meta = lerMeta(pastaAbs);
      const m = pasta.name.match(PADRAO_PASTA);

      const status = statusDaAtividade(RAIZ, pastaRel);
      const pdf = acharPorExtensao(pastaAbs, '.pdf');
      const docx = acharPorExtensao(pastaAbs, '.docx');

      atividades.push({
        materia: materia.name,
        pasta: pastaRel,
        nome: meta?.tarefa || pasta.name,
        tipo: meta?.tipo || (m ? m[1] : null),
        semana: meta?.semana ?? (m ? Number(m[2]) : null),
        prazo: meta?.prazo || null,
        pontos: meta?.pontos ?? null,
        link: meta?.link || null,
        temContexto: fs.existsSync(path.join(pastaAbs, '_contexto')),
        temRelatorio: fs.existsSync(path.join(pastaAbs, 'entrega', 'relatorio.md')),
        pdf: pdf ? path.relative(RAIZ, pdf).replace(/\\/g, '/') : null,
        docx: docx ? path.relative(RAIZ, docx).replace(/\\/g, '/') : null,
        ...status,
      });
    }
  }

  atividades.sort((a, b) => {
    if (a.prazo && b.prazo) return new Date(a.prazo) - new Date(b.prazo);
    if (a.prazo) return -1;
    if (b.prazo) return 1;
    return a.materia.localeCompare(b.materia) || a.nome.localeCompare(b.nome);
  });
  return atividades;
}

// ------------------------------------------------------------ acesso a disco

/** So deixa acessar pastas que sao, de fato, atividades dentro de entregas/. */
function validarPasta(pastaRel) {
  if (!pastaRel) return null;
  const abs = path.resolve(RAIZ, pastaRel);
  if (!abs.startsWith(PASTA_ENTREGAS + path.sep)) return null;
  if (!fs.existsSync(abs)) return null;
  return abs;
}

const DOCUMENTOS_PERMITIDOS = {
  relatorio: 'entrega/relatorio.md',
  pendencias: '_pendencias.md',
  revisao: '_revisao.md',
  enunciado: '_contexto/enunciado.md',
};

// marked 16+ e ESM-only: require() nao funciona num script CommonJS.
let _marked;
async function garantirMarked() {
  if (!_marked) _marked = (await import('marked')).marked;
  return _marked;
}

async function lerDocumento(pastaRel, chave) {
  const rel = DOCUMENTOS_PERMITIDOS[chave];
  const pastaAbs = validarPasta(pastaRel);
  if (!rel || !pastaAbs) return null;

  const arq = path.join(pastaAbs, rel);
  if (!fs.existsSync(arq)) return { existe: false };

  const bruto = fs.readFileSync(arq, 'utf8');
  // O cabecalho --- titulo/atividade --- e metadado para o relatorio.js
  // montar a capa do .docx, nao conteudo para exibir no preview.
  const semCabecalho = bruto.replace(/^---\n[\s\S]*?\n---\n?/, '');
  const marked = await garantirMarked();
  return { existe: true, bruto, html: marked.parse(semCabecalho) };
}

// ------------------------------------------------------------------- notas

// Consulta o Canvas de verdade; cacheia por um tempo curto pra nao bater na
// API a cada troca de aba do navegador.
let cacheNotas = null;
let cacheNotasEm = 0;
const TTL_NOTAS_MS = 2 * 60 * 1000;

function clienteCanvas() {
  return new Canvas({
    baseUrl: cfg.baseUrl,
    token: process.env.CANVAS_TOKEN,
    cookie: process.env.CANVAS_COOKIE,
  });
}

async function buscarNotas(forcar) {
  if (!forcar && cacheNotas && Date.now() - cacheNotasEm < TTL_NOTAS_MS) return cacheNotas;

  const canvas = clienteCanvas();
  const [matriculas, todosCursos] = await Promise.all([canvas.matriculas(), canvas.cursos()]);
  const porId = new Map((todosCursos || []).map((c) => [String(c.id), c]));

  const incluir = (cfg.cursos?.incluir || []).map(String);
  const ignorar = (cfg.cursos?.ignorar || []).map(String);

  const cursos = [];
  for (const m of matriculas || []) {
    const cursoId = String(m.course_id);
    if (ignorar.includes(cursoId)) continue;
    if (incluir.length && !incluir.includes(cursoId)) continue;

    const cursoBruto = porId.get(cursoId) || { id: cursoId, name: `curso-${cursoId}` };
    const tarefas = await canvas.tarefas(cursoId).catch(() => []);

    cursos.push({
      cursoId,
      materia: materiaDe(cursoBruto, cfg.cursos?.apelidos),
      notaAtual: { pontos: m.grades?.current_score ?? null, letra: m.grades?.current_grade ?? null },
      notaFinal: { pontos: m.grades?.final_score ?? null, letra: m.grades?.final_grade ?? null },
      tarefas: (tarefas || [])
        .filter((t) => t.points_possible != null)
        .map((t) => ({
          nome: t.name,
          pontosPossiveis: t.points_possible,
          nota: t.submission?.score ?? null,
          letra: t.submission?.grade ?? null,
          entregue: !!t.submission?.submitted_at,
          prazo: t.due_at,
        }))
        .sort((a, b) => new Date(a.prazo || 0) - new Date(b.prazo || 0)),
    });
  }

  cursos.sort((a, b) => a.materia.localeCompare(b.materia));
  cacheNotas = { atualizadoEm: new Date().toISOString(), cursos };
  cacheNotasEm = Date.now();
  return cacheNotas;
}

// --------------------------------------------------------- rodar scripts

// Acoes 'node' chamam um dos scripts deste diretorio. Acoes 'agente' chamam
// o CLI configurado em config.json->agente com um prompt de slash-command —
// e' assim que o painel dispara o Claude pra escrever/revisar sem chat.
const ACOES = {
  coletar: { tipo: 'node', script: 'coletar.js' },
  relatorio: { tipo: 'node', script: 'relatorio.js' },
  resumo: { tipo: 'node', script: 'resumo.js' },
  rodada: { tipo: 'agente', prompt: '/atividades' },
  revisar: { tipo: 'agente', prompt: '/revisar', precisaPasta: true },
};

const jobs = new Map(); // id -> { linhas: string[], ouvintes: Set<res>, encerrado: bool, codigo: number|null }
let proximoId = 1;

/** Comando/flags do agente configurado, compartilhado entre as acoes fixas e o chat. */
function configAgente() {
  const comando = cfg.agente?.comando || 'claude';
  const flags = [...(cfg.agente?.flags || [])];
  const modelo = cfg.agente?.modelo || cfg.agente?.openrouterModel;
  if (modelo && !flags.includes('--model')) {
    flags.push('--model', modelo);
  }
  const streamJson = cfg.agente?.streamJson !== false;
  return { comando, flags, streamJson };
}

function montarComando(acaoChave, args) {
  const acao = ACOES[acaoChave];
  if (!acao) throw new Error(`acao desconhecida: ${acaoChave}`);

  // args so pode conter pastas ja conhecidas (evita passar flag arbitraria pro spawn).
  const argsSeguros = (args || []).map(String);

  if (acao.tipo === 'node') {
    if (acaoChave === 'relatorio' && argsSeguros[0]) {
      const pastaAbs = validarPasta(argsSeguros[0]);
      if (!pastaAbs) throw new Error('pasta invalida');

      // Sem _contexto/meta.json o relatorio.js nao sabe nomear o arquivo e cria
      // um novo ("Atividade -.docx") em vez de regerar o que ja existe.
      const docxExistente = acharPorExtensao(pastaAbs, '.docx');
      if (docxExistente && !argsSeguros.includes('--saida')) {
        argsSeguros.push('--saida', path.relative(pastaAbs, docxExistente));
      }
    }
    return { comando: 'node', args: [path.join(__dirname, acao.script), ...argsSeguros] };
  }

  // tipo 'agente'
  let pastaRel = null;
  if (acao.precisaPasta) {
    pastaRel = argsSeguros[0];
    if (!validarPasta(pastaRel)) throw new Error('pasta invalida');
  }
  const prompt = pastaRel ? `${acao.prompt} ${pastaRel}` : acao.prompt;
  const { comando, flags, streamJson } = configAgente();
  const extras = streamJson ? ['--output-format', 'stream-json', '--verbose'] : [];
  return { comando, args: ['-p', prompt, ...extras, ...flags], streamJson };
}

/** Acumula pedacos de stream e devolve linhas completas — um JSON grande pode vir partido entre dois eventos 'data'. */
function leitorDeLinhas(aoLinha) {
  let resto = '';
  return (pedaco) => {
    resto += pedaco.toString();
    const linhas = resto.split('\n');
    resto = linhas.pop();
    linhas.forEach(aoLinha);
  };
}

const NOMES_FERRAMENTA = {
  Read: (i) => `Lendo ${i.file_path || ''}`,
  Write: (i) => `Escrevendo ${i.file_path || ''}`,
  Edit: (i) => `Editando ${i.file_path || ''}`,
  Bash: (i) => {
    const primeira = String(i.command || '').split('\n')[0];
    const cortada = primeira.length > 140 || String(i.command || '').includes('\n');
    return `$ ${primeira.slice(0, 140)}${cortada ? ' …' : ''}`;
  },
  Glob: (i) => `Procurando arquivos: ${i.pattern || ''}`,
  Grep: (i) => `Procurando texto: ${i.pattern || ''}`,
  Task: (i) => `Chamando agente ${i.subagent_type || i.description || ''}`,
  TodoWrite: () => 'Atualizando lista de passos',
};

/**
 * Traduz uma linha de --output-format stream-json em algo legivel pro log do
 * painel. Sem isso, o CLI da Claude fica mudo ate a resposta final — minutos
 * de silencio numa rodada com varias atividades, com cara de travado.
 */
function resumirEventoAgente(linha) {
  let evento;
  try {
    evento = JSON.parse(linha);
  } catch {
    return [linha]; // nao era JSON (ex.: aviso de stdin do proprio CLI) — mostra cru
  }

  if (evento.type === 'assistant') {
    const saida = [];
    for (const bloco of evento.message?.content || []) {
      if (bloco.type === 'tool_use') {
        const f = NOMES_FERRAMENTA[bloco.name];
        saida.push(f ? f(bloco.input || {}) : `Usando ${bloco.name}`);
      } else if (bloco.type === 'text' && bloco.text?.trim()) {
        saida.push(...bloco.text.trim().split('\n'));
      }
    }
    return saida;
  }

  if (evento.type === 'result') {
    if (evento.is_error) return [`Erro: ${evento.result || 'a rodada terminou com erro'}`];
    const s = (evento.duration_ms / 1000).toFixed(0);
    return [`Concluido em ${s}s.`];
  }

  return []; // eventos de sistema/hook/thinking/tool_result: ruido demais pro log
}

/** Env do processo filho: process.env + .env, roteando pro OpenRouter se configurado. */
function envDoAgente() {
  const envProc = { ...process.env };
  const envPath = path.join(RAIZ, '.env');
  if (fs.existsSync(envPath)) {
    const txt = fs.readFileSync(envPath, 'utf8');
    txt.split('\n').forEach((l) => {
      const idx = l.indexOf('=');
      if (idx > 0 && !l.trim().startsWith('#')) {
        envProc[l.slice(0, idx).trim()] = l.slice(idx + 1).trim();
      }
    });
  }

  if (cfg.agente?.provedor === 'openrouter' && envProc.OPENROUTER_API_KEY) {
    envProc.ANTHROPIC_BASE_URL = 'https://openrouter.ai/api/v1';
    envProc.ANTHROPIC_API_KEY = envProc.OPENROUTER_API_KEY;
  }
  return envProc;
}

function iniciarJob(acaoChave, args) {
  const { comando, args: argsProc, streamJson } = montarComando(acaoChave, args);

  const id = String(proximoId++);
  const job = { linhas: [], ouvintes: new Set(), encerrado: false, codigo: null };
  jobs.set(id, job);

  const emitir = (linha) => {
    job.linhas.push(linha);
    for (const res of job.ouvintes) res.write(`data: ${JSON.stringify(linha)}\n\n`);
  };

  const proc = spawn(comando, argsProc, { cwd: RAIZ, env: envDoAgente() });

  const aoStdout = streamJson
    ? (linha) => resumirEventoAgente(linha).forEach(emitir)
    : (linha) => { if (linha) emitir(linha); };
  const aoStderr = (linha) => { if (linha) emitir(linha); };

  proc.stdout.on('data', leitorDeLinhas(aoStdout));
  proc.stderr.on('data', leitorDeLinhas(aoStderr));
  proc.on('error', (e) => emitir(`[erro ao iniciar '${comando}': ${e.message}]`));
  proc.on('close', (codigo) => {
    job.encerrado = true;
    job.codigo = codigo;
    for (const res of job.ouvintes) {
      res.write(`event: fim\ndata: ${codigo}\n\n`);
      res.end();
    }
    job.ouvintes.clear();
  });

  return id;
}

// ------------------------------------------------------------------- chat

const PROMPT_ESCOPO_CHAT = (pastaRel) => [
  `Voce esta numa conversa de chat dentro do painel do Taia, focada em UMA atividade especifica: "${pastaRel}".`,
  'So edite arquivos dentro dessa pasta — principalmente entrega/relatorio.md.',
  'Se o usuario pedir uma correcao, edite o relatorio.md direto e explique o que mudou.',
  'Se for so uma pergunta/duvida, responda sem editar nada.',
  'Nao chame o agente revisor-academico nem regere o .docx/.pdf por conta propria — isso e feito pelos botoes "Revisar de novo" e "Regerar atividade" do painel, fora deste chat, a menos que o usuario peca isso explicitamente aqui.',
  'Responda em portugues do Brasil, direto, como numa conversa por chat — sem formalidade de relatorio academico.',
].join(' ');

function pastaChat(pastaAbs) {
  return path.join(pastaAbs, '_chat');
}

function pastaAnexosChat(pastaAbs) {
  return path.join(pastaChat(pastaAbs), 'anexos');
}

/** Nome de arquivo seguro (sem barra/"..") com prefixo de tempo, pra dois anexos com o mesmo nome não se sobrescreverem. */
function nomeAnexoSeguro(nome) {
  const base = path.basename(String(nome || '')).replace(/\.\./g, '').trim();
  if (!base) return null;
  return `${Date.now()}-${base}`;
}

const MIME_ANEXO = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function lerSessaoChat(pastaAbs) {
  const arq = path.join(pastaChat(pastaAbs), 'sessao.json');
  if (!fs.existsSync(arq)) return null;
  try { return JSON.parse(fs.readFileSync(arq, 'utf8')).sessionId || null; } catch { return null; }
}

function gravarSessaoChat(pastaAbs, sessionId) {
  const dir = pastaChat(pastaAbs);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'sessao.json'), JSON.stringify({ sessionId }, null, 2), 'utf8');
}

function lerHistoricoChat(pastaAbs) {
  const arq = path.join(pastaChat(pastaAbs), 'historico.json');
  if (!fs.existsSync(arq)) return [];
  try { return JSON.parse(fs.readFileSync(arq, 'utf8')); } catch { return []; }
}

function acrescentarHistoricoChat(pastaAbs, turno) {
  const dir = pastaChat(pastaAbs);
  fs.mkdirSync(dir, { recursive: true });
  const historico = lerHistoricoChat(pastaAbs);
  historico.push(turno);
  fs.writeFileSync(path.join(dir, 'historico.json'), JSON.stringify(historico, null, 2), 'utf8');
}

const chatsEmAndamento = new Map(); // pastaRel -> chatJobId
const chatJobs = new Map(); // id -> { ouvintes: Set<res>, encerrado }

/**
 * Dispara uma mensagem de chat pra uma atividade. Sempre pede stream-json —
 * diferente das acoes de /api/rodar, o chat depende de separar texto de
 * tool_use pra funcionar, entao nao da pra deixar isso opcional aqui.
 */
function iniciarChat(pastaRel, texto, anexos) {
  const pastaAbs = validarPasta(pastaRel);
  if (!pastaAbs) throw new Error('pasta invalida');
  if (chatsEmAndamento.has(pastaRel)) throw new Error('já tem uma resposta em andamento nesta atividade');

  // So aceita nomes que realmente existem em _chat/anexos/ dessa atividade —
  // evita que o corpo da requisicao aponte pra arquivo de outro lugar.
  const dirAnexos = pastaAnexosChat(pastaAbs);
  const anexosValidos = (anexos || []).filter((n) => typeof n === 'string' && fs.existsSync(path.join(dirAnexos, path.basename(n))));

  acrescentarHistoricoChat(pastaAbs, {
    role: 'user',
    texto,
    ...(anexosValidos.length ? { anexos: anexosValidos } : {}),
    criadoEm: new Date().toISOString(),
  });

  const textoComAnexos = anexosValidos.length
    ? `${texto}\n\n[Anexo(s) enviados nesta mensagem — leia com a tool Read antes de responder: ${anexosValidos.map((n) => `${pastaRel}/_chat/anexos/${n}`).join(', ')}]`
    : texto;

  const sessaoExistente = lerSessaoChat(pastaAbs);
  const sessionId = sessaoExistente || crypto.randomUUID();
  if (!sessaoExistente) gravarSessaoChat(pastaAbs, sessionId);

  const { comando, flags } = configAgente();
  const argsSessao = sessaoExistente ? ['--resume', sessionId] : ['--session-id', sessionId];
  const argsSistema = sessaoExistente ? [] : ['--append-system-prompt', PROMPT_ESCOPO_CHAT(pastaRel)];
  const argsProc = ['-p', textoComAnexos, ...argsSistema, ...argsSessao, '--output-format', 'stream-json', '--verbose', ...flags];

  const id = 'chat-' + String(proximoId++);
  // eventos: replay pra quem conectar no SSE depois do processo ja ter emitido algo
  // (a resposta do POST chega, o front abre o EventSource — sempre tem uma corridinha aí).
  const job = { ouvintes: new Set(), eventos: [], encerrado: false, textoAcumulado: '' };
  chatJobs.set(id, job);
  chatsEmAndamento.set(pastaRel, id);

  const emitir = (evento, dados) => {
    job.eventos.push({ evento, dados });
    for (const res of job.ouvintes) res.write(`event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`);
  };

  const proc = spawn(comando, argsProc, { cwd: RAIZ, env: envDoAgente() });

  const aoLinha = (linha) => {
    let ev;
    try { ev = JSON.parse(linha); } catch { return; }

    if (ev.type === 'assistant') {
      // Cada linha 'assistant' e uma rodada (fala, chama ferramenta, fala de novo).
      // Sem separador, texto de rodadas diferentes gruda sem espaco/quebra.
      let primeiroTextoDaRodada = true;
      for (const bloco of ev.message?.content || []) {
        if (bloco.type === 'tool_use') {
          const f = NOMES_FERRAMENTA[bloco.name];
          emitir('status', f ? f(bloco.input || {}) : `Usando ${bloco.name}`);
        } else if (bloco.type === 'text' && bloco.text) {
          let pedaco = bloco.text;
          if (primeiroTextoDaRodada && job.textoAcumulado && !/\s$/.test(job.textoAcumulado)) {
            pedaco = '\n\n' + pedaco;
          }
          primeiroTextoDaRodada = false;
          job.textoAcumulado += pedaco;
          emitir('texto', pedaco);
        }
      }
    } else if (ev.type === 'result' && ev.is_error) {
      emitir('status', `Erro: ${ev.result || 'a conversa terminou com erro'}`);
    }
  };

  proc.stdout.on('data', leitorDeLinhas(aoLinha));
  proc.stderr.on('data', leitorDeLinhas((linha) => { if (linha) emitir('status', linha); }));
  proc.on('error', (e) => emitir('status', `[erro ao iniciar '${comando}': ${e.message}]`));
  proc.on('close', () => {
    job.encerrado = true;
    if (job.textoAcumulado.trim()) {
      acrescentarHistoricoChat(pastaAbs, { role: 'assistant', texto: job.textoAcumulado.trim(), criadoEm: new Date().toISOString() });
    }
    for (const res of job.ouvintes) {
      res.write(`event: fim\ndata: {}\n\n`);
      res.end();
    }
    job.ouvintes.clear();
    chatsEmAndamento.delete(pastaRel);
  });

  return id;
}

// -------------------------------------------------------------------- http

const ESTATICO = path.join(RAIZ, 'painel', 'dist');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.json': 'application/json; charset=utf-8',
};

/** Serve o build do React (painel/dist). Qualquer rota sem extensao cai no index.html (SPA). */
function servirEstatico(pathname, res) {
  if (!fs.existsSync(ESTATICO)) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end(
      'painel/dist nao existe ainda. Rode:\n  cd painel\n  npm install\n  npm run build'
    );
  }

  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  let arq = path.join(ESTATICO, rel);
  if (!arq.startsWith(ESTATICO + path.sep) && arq !== ESTATICO) arq = path.join(ESTATICO, 'index.html');
  if (!fs.existsSync(arq) || fs.statSync(arq).isDirectory()) arq = path.join(ESTATICO, 'index.html');

  const tipo = MIME[path.extname(arq)] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': tipo });
  fs.createReadStream(arq).pipe(res);
}

function enviarJson(res, corpo, status = 200) {
  const s = JSON.stringify(corpo);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(s) });
  res.end(s);
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let dados = '';
    const limite = 50 * 1024 * 1024; // 50MB
    req.on('data', (c) => {
      dados += c;
      if (dados.length > limite) {
        reject(new Error('Corpo da requisição excede o limite de 50MB'));
        req.destroy();
      }
    });
    req.on('end', () => { try { resolve(dados ? JSON.parse(dados) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === 'GET' && !url.pathname.startsWith('/api/')) {
      return servirEstatico(url.pathname, res);
    }

    if (req.method === 'GET' && url.pathname === '/api/atividades') {
      return enviarJson(res, { atividades: listarAtividades() });
    }

    if (req.method === 'GET' && url.pathname === '/api/documento') {
      const doc = await lerDocumento(url.searchParams.get('pasta'), url.searchParams.get('doc'));
      if (!doc) return enviarJson(res, { erro: 'pasta ou documento invalido' }, 400);
      return enviarJson(res, doc);
    }

    if (req.method === 'GET' && url.pathname === '/api/pdf') {
      const pastaAbs = validarPasta(url.searchParams.get('pasta'));
      const pdf = pastaAbs && acharPorExtensao(pastaAbs, '.pdf');
      if (!pdf) { res.writeHead(404); return res.end('sem PDF'); }
      res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${path.basename(pdf)}"` });
      return fs.createReadStream(pdf).pipe(res);
    }

    if (req.method === 'GET' && url.pathname === '/api/notas') {
      try {
        const notas = await buscarNotas(url.searchParams.get('forcar') === '1');
        return enviarJson(res, notas);
      } catch (e) {
        return enviarJson(res, { erro: e.message }, 502);
      }
    }

    if (req.method === 'POST' && url.pathname === '/api/rodar') {
      const corpo = await lerCorpo(req);
      try {
        const id = iniciarJob(corpo.script, corpo.args);
        return enviarJson(res, { id });
      } catch (e) {
        return enviarJson(res, { erro: e.message }, 400);
      }
    }

    if (req.method === 'POST' && url.pathname === '/api/entregar') {
      const corpo = await lerCorpo(req);
      const { pasta: pastaRel } = corpo;
      const pastaAbs = validarPasta(pastaRel);
      if (!pastaAbs) return enviarJson(res, { erro: 'pasta invalida' }, 400);

      const meta = lerMeta(pastaAbs);
      if (!meta?.cursoId || !meta?.tarefaId) {
        return enviarJson(res, { erro: 'meta.json nao tem cursoId/tarefaId — execute "Coletar do Canvas" antes de entregar.' }, 400);
      }

      // Prefere PDF; cai no DOCX se nao houver.
      const arquivo = acharPorExtensao(pastaAbs, '.pdf') || acharPorExtensao(pastaAbs, '.docx');
      if (!arquivo) return enviarJson(res, { erro: 'Nao encontrei PDF nem DOCX em entrega/. Gere a atividade primeiro.' }, 400);

      try {
        const canvas = clienteCanvas();
        const nomeArquivo = path.basename(arquivo);
        const arquivoId = await canvas.enviarArquivo(meta.cursoId, meta.tarefaId, arquivo, nomeArquivo);
        const sub = await canvas.submeter(meta.cursoId, meta.tarefaId, arquivoId);
        return enviarJson(res, {
          ok: true,
          arquivo: nomeArquivo,
          submissaoId: sub?.id,
          url: sub?.url || `${cfg.baseUrl}/courses/${meta.cursoId}/assignments/${meta.tarefaId}/submissions`,
        });
      } catch (e) {
        return enviarJson(res, { erro: e.message }, 502);
      }
    }

    if (req.method === 'GET' && url.pathname === '/api/chat') {
      const pastaAbs = validarPasta(url.searchParams.get('pasta'));
      if (!pastaAbs) return enviarJson(res, { erro: 'pasta invalida' }, 400);
      return enviarJson(res, { mensagens: lerHistoricoChat(pastaAbs) });
    }

    if (req.method === 'POST' && url.pathname === '/api/chat') {
      const corpo = await lerCorpo(req);
      const { pasta: pastaRel, texto, anexos } = corpo;
      const temAnexo = Array.isArray(anexos) && anexos.length > 0;
      if (!texto?.trim() && !temAnexo) return enviarJson(res, { erro: 'texto vazio' }, 400);
      try {
        const id = iniciarChat(pastaRel, texto?.trim() || 'Veja o(s) anexo(s) enviados.', anexos);
        return enviarJson(res, { id });
      } catch (e) {
        return enviarJson(res, { erro: e.message }, 409);
      }
    }

    if (req.method === 'POST' && url.pathname === '/api/chat/anexo') {
      const corpo = await lerCorpo(req);
      const { pasta: pastaRel, nome, conteudo } = corpo;
      if (!nome || !conteudo) return enviarJson(res, { erro: 'nome e conteudo sao obrigatorios' }, 400);

      const nomeSalvo = nomeAnexoSeguro(nome);
      const pastaAbs = validarPasta(pastaRel);
      if (!pastaAbs || !nomeSalvo) return enviarJson(res, { erro: 'pasta ou nome invalido' }, 400);

      const dir = pastaAnexosChat(pastaAbs);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, nomeSalvo), Buffer.from(conteudo, 'base64'));

      return enviarJson(res, { ok: true, nome: nomeSalvo });
    }

    if (req.method === 'GET' && url.pathname === '/api/chat/anexo') {
      const pastaAbs = validarPasta(url.searchParams.get('pasta'));
      const nomeSeg = path.basename(url.searchParams.get('nome') || '');
      if (!pastaAbs || !nomeSeg) { res.writeHead(400); return res.end('pasta ou nome invalido'); }

      const arq = path.join(pastaAnexosChat(pastaAbs), nomeSeg);
      if (!fs.existsSync(arq)) { res.writeHead(404); return res.end('anexo nao encontrado'); }

      res.writeHead(200, { 'Content-Type': MIME_ANEXO[path.extname(arq).toLowerCase()] || 'application/octet-stream' });
      return fs.createReadStream(arq).pipe(res);
    }

    if (req.method === 'GET' && url.pathname.startsWith('/api/chat/') && url.pathname.endsWith('/eventos')) {
      const id = url.pathname.split('/')[3];
      const job = chatJobs.get(id);
      if (!job) { res.writeHead(404); return res.end(); }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      job.eventos.forEach(({ evento, dados }) => res.write(`event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`));
      if (job.encerrado) {
        res.write(`event: fim\ndata: {}\n\n`);
        return res.end();
      }
      job.ouvintes.add(res);
      req.on('close', () => job.ouvintes.delete(res));
      return;
    }

    // ── Materiais de contexto (_contexto/materiais/) ──────────────────────────
    // Aceita upload via JSON com conteudo em base64 para nao precisar de
    // multipart parser — so local, arquivos pequenos (contexto para o agente).

    if (req.method === 'GET' && url.pathname === '/api/materiais') {
      const pastaAbs = validarPasta(url.searchParams.get('pasta'));
      if (!pastaAbs) return enviarJson(res, { erro: 'pasta invalida' }, 400);
      const dir = path.join(pastaAbs, '_contexto', 'materiais');
      if (!fs.existsSync(dir)) return enviarJson(res, { arquivos: [] });
      const arquivos = fs.readdirSync(dir)
        .filter((n) => !n.startsWith('.'))
        .map((nome) => {
          const stat = fs.statSync(path.join(dir, nome));
          return { nome, tamanhoBytes: stat.size, modificadoEm: stat.mtime.toISOString() };
        })
        .sort((a, b) => a.nome.localeCompare(b.nome));
      return enviarJson(res, { arquivos });
    }

    if (req.method === 'POST' && url.pathname === '/api/materiais') {
      const corpo = await lerCorpo(req);
      const { pasta: pastaRel, nome, conteudo, tipo = 'text/plain' } = corpo;
      if (!nome || !conteudo) return enviarJson(res, { erro: 'nome e conteudo sao obrigatorios' }, 400);

      // Sanitiza o nome: sem barras, sem pontos duplos.
      const nomeSeg = path.basename(nome).replace(/\.\./g, '').trim();
      if (!nomeSeg) return enviarJson(res, { erro: 'nome invalido' }, 400);

      const pastaAbs = validarPasta(pastaRel);
      if (!pastaAbs) return enviarJson(res, { erro: 'pasta invalida' }, 400);

      const dir = path.join(pastaAbs, '_contexto', 'materiais');
      fs.mkdirSync(dir, { recursive: true });

      const destino = path.join(dir, nomeSeg);
      // conteudo pode chegar como base64 (binarios) ou texto puro (notas .md)
      const ehBase64 = corpo.base64 === true;
      fs.writeFileSync(destino, ehBase64 ? Buffer.from(conteudo, 'base64') : conteudo, ehBase64 ? undefined : 'utf8');

      const stat = fs.statSync(destino);
      return enviarJson(res, { ok: true, arquivo: { nome: nomeSeg, tamanhoBytes: stat.size, modificadoEm: stat.mtime.toISOString() } });
    }

    if (req.method === 'DELETE' && url.pathname === '/api/materiais') {
      const corpo = await lerCorpo(req);
      const { pasta: pastaRel, nome } = corpo;
      const nomeSeg = nome ? path.basename(nome).replace(/\.\./g, '').trim() : '';
      const pastaAbs = validarPasta(pastaRel);
      if (!pastaAbs || !nomeSeg) return enviarJson(res, { erro: 'pasta ou nome invalido' }, 400);

      const arq = path.join(pastaAbs, '_contexto', 'materiais', nomeSeg);
      // So deleta se estiver dentro da pasta certa.
      if (!arq.startsWith(path.join(pastaAbs, '_contexto', 'materiais'))) {
        return enviarJson(res, { erro: 'caminho invalido' }, 400);
      }
      if (fs.existsSync(arq)) fs.unlinkSync(arq);
      return enviarJson(res, { ok: true });
    }

    if (req.method === 'POST' && url.pathname === '/api/limpar') {
      const corpo = await lerCorpo(req);
      const { pasta: pastaRel } = corpo;
      const pastaAbs = validarPasta(pastaRel);
      if (!pastaAbs) return enviarJson(res, { erro: 'pasta invalida' }, 400);

      // Limpa a pasta entrega/ (arquivos gerados)
      const dirEntrega = path.join(pastaAbs, 'entrega');
      if (fs.existsSync(dirEntrega)) {
        fs.rmSync(dirEntrega, { recursive: true, force: true });
      }

      // Remove os relatórios de revisão e pendências
      const rev = path.join(pastaAbs, '_revisao.md');
      if (fs.existsSync(rev)) fs.unlinkSync(rev);

      const pend = path.join(pastaAbs, '_pendencias.md');
      if (fs.existsSync(pend)) fs.unlinkSync(pend);

      return enviarJson(res, { ok: true });
    }

    // ── Configurações (Canvas & IA) ───────────────────────────────────────────

    if (req.method === 'GET' && url.pathname === '/api/configuracoes') {
      const envPath = path.join(RAIZ, '.env');
      const envs = {};
      if (fs.existsSync(envPath)) {
        const envTxt = fs.readFileSync(envPath, 'utf8');
        envTxt.split('\n').forEach((l) => {
          const idx = l.indexOf('=');
          if (idx > 0 && !l.trim().startsWith('#')) {
            envs[l.slice(0, idx).trim()] = l.slice(idx + 1).trim();
          }
        });
      }

      return enviarJson(res, {
        canvasToken: envs.CANVAS_TOKEN || process.env.CANVAS_TOKEN || '',
        anthropicKey: envs.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || '',
        openaiKey: envs.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
        openrouterKey: envs.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || '',
        geminiKey: envs.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
        aluno: cfg.aluno || '',
        agente: cfg.agente || { comando: 'claude', flags: ['--permission-mode', 'acceptEdits'], streamJson: true },
        baseUrl: cfg.baseUrl || 'https://lms.jala.university',
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/configuracoes') {
      const corpo = await lerCorpo(req);
      const { canvasToken, anthropicKey, openaiKey, openrouterKey, geminiKey, aluno, agente } = corpo;

      const envPath = path.join(RAIZ, '.env');
      let envMap = {};
      if (fs.existsSync(envPath)) {
        const envTxt = fs.readFileSync(envPath, 'utf8');
        envTxt.split('\n').forEach((l) => {
          const idx = l.indexOf('=');
          if (idx > 0 && !l.trim().startsWith('#')) {
            envMap[l.slice(0, idx).trim()] = l.slice(idx + 1).trim();
          }
        });
      }

      if (typeof canvasToken === 'string') {
        envMap.CANVAS_TOKEN = canvasToken.trim();
        process.env.CANVAS_TOKEN = canvasToken.trim();
      }
      if (typeof anthropicKey === 'string') {
        envMap.ANTHROPIC_API_KEY = anthropicKey.trim();
        process.env.ANTHROPIC_API_KEY = anthropicKey.trim();
      }
      if (typeof openaiKey === 'string') {
        envMap.OPENAI_API_KEY = openaiKey.trim();
        process.env.OPENAI_API_KEY = openaiKey.trim();
      }
      if (typeof openrouterKey === 'string') {
        envMap.OPENROUTER_API_KEY = openrouterKey.trim();
        process.env.OPENROUTER_API_KEY = openrouterKey.trim();
      }
      if (typeof geminiKey === 'string') {
        envMap.GEMINI_API_KEY = geminiKey.trim();
        process.env.GEMINI_API_KEY = geminiKey.trim();
      }

      const envContent = Object.entries(envMap)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');
      fs.writeFileSync(envPath, envContent + '\n', 'utf8');

      if (aluno !== undefined) cfg.aluno = aluno.trim();
      if (agente !== undefined) cfg.agente = agente;

      fs.writeFileSync(path.join(RAIZ, 'config.json'), JSON.stringify(cfg, null, 2), 'utf8');
      return enviarJson(res, { ok: true });
    }

    if (req.method === 'POST' && url.pathname === '/api/testar-canvas') {
      try {
        const canvas = clienteCanvas();
        const cursos = await canvas.buscarCursos();
        return enviarJson(res, { ok: true, totalCursos: cursos.length });
      } catch (e) {
        return enviarJson(res, { ok: false, erro: e.message }, 400);
      }
    }

    if (req.method === 'POST' && url.pathname === '/api/testar-openrouter') {
      try {
        const envPath = path.join(RAIZ, '.env');
        let key = process.env.OPENROUTER_API_KEY || '';
        if (fs.existsSync(envPath)) {
          const envTxt = fs.readFileSync(envPath, 'utf8');
          const matchOR = envTxt.match(/^OPENROUTER_API_KEY=(.*)$/m);
          if (matchOR) key = matchOR[1].trim();
        }
        if (!key) return enviarJson(res, { ok: false, erro: 'OPENROUTER_API_KEY ausente' }, 400);

        const resp = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: { Authorization: `Bearer ${key}` },
        });
        const json = await resp.json();
        if (resp.ok && json.data) {
          return enviarJson(res, { ok: true, label: json.data.label, usage: json.data.usage });
        }
        return enviarJson(res, { ok: false, erro: json.error?.message || 'Chave inválida' }, 400);
      } catch (e) {
        return enviarJson(res, { ok: false, erro: e.message }, 400);
      }
    }

    if (req.method === 'GET' && url.pathname.startsWith('/api/rodar/') && url.pathname.endsWith('/eventos')) {
      const id = url.pathname.split('/')[3];
      const job = jobs.get(id);
      if (!job) { res.writeHead(404); return res.end(); }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      job.linhas.forEach((l) => res.write(`data: ${JSON.stringify(l)}\n\n`));
      if (job.encerrado) {
        res.write(`event: fim\ndata: ${job.codigo}\n\n`);
        return res.end();
      }
      job.ouvintes.add(res);
      req.on('close', () => job.ouvintes.delete(res));
      return;
    }

    res.writeHead(404);
    res.end('nao encontrado');
  } catch (e) {
    enviarJson(res, { erro: e.message }, 500);
  }
});

servidor.listen(PORTA, '127.0.0.1', () => {
  console.log(`Painel em http://127.0.0.1:${PORTA}`);
});
