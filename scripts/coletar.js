'use strict';
/**
 * Coleta do Canvas as atividades da semana e todo o contexto necessario,
 * montando a arvore entregas/<Materia>/<Tipo> Semana NN/_contexto/.
 *
 * Uso:
 *   node scripts/coletar.js
 *   node scripts/coletar.js --dias 21          (janela maior para frente)
 *   node scripts/coletar.js --curso 1067       (so um curso)
 *   node scripts/coletar.js --todas            (inclui as ja entregues)
 */
const fs = require('fs');
const path = require('path');
const { Canvas } = require('./lib/canvas');
const {
  nomeSeguro, slug, pad2, garantirPasta, detectarSemana, detectarTipo,
  htmlParaMarkdown, extrairArquivos, arquivoUtil, prioridadeArquivo,
  formatarData, carregarEnv, materiaDe,
} = require('./lib/util');

const RAIZ = path.resolve(__dirname, '..');
carregarEnv(RAIZ);
const cfg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'config.json'), 'utf8'));

const argv = process.argv.slice(2);
const arg = (nome, padrao) => {
  const i = argv.indexOf(`--${nome}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : padrao;
};
const flag = (nome) => argv.includes(`--${nome}`);

const AGORA = new Date();
const DIAS_ATRAS = Number(arg('atras', cfg.janela.diasAtras));
const DIAS_FRENTE = Number(arg('dias', cfg.janela.diasFrente));
const INICIO = new Date(AGORA.getTime() - DIAS_ATRAS * 86400000);
const FIM = new Date(AGORA.getTime() + DIAS_FRENTE * 86400000);
const MAX_BYTES = (cfg.limites?.maxMbPorArquivo || 40) * 1024 * 1024;
const MAX_ARQ = cfg.limites?.maxArquivosPorAtividade || 15;

const log = (...a) => console.log(...a);

/** Indexa os modulos por assignment id, para achar o material da semana. */
function indexarModulos(modulos) {
  const porTarefa = new Map();
  for (const m of modulos || []) {
    for (const item of m.items || []) {
      if (item.type === 'Assignment' && item.content_id != null) {
        porTarefa.set(String(item.content_id), m);
      }
    }
  }
  return porTarefa;
}

/**
 * Busca metadados de todos os arquivos referenciados, descarta a decoracao do
 * tema do Canvas, ordena por relevancia (slides na frente) e baixa ate o limite.
 */
async function baixarLote(canvas, ids, destino, pastaCtx, limite) {
  const metas = [];
  for (const id of new Set(ids)) {
    const meta = await canvas.arquivo(id).catch(() => null);
    if (meta && meta.url) metas.push(meta);
  }

  const uteis = metas
    .filter((m) => arquivoUtil(m.display_name, m.size || 0))
    .sort((a, b) => prioridadeArquivo(a.display_name) - prioridadeArquivo(b.display_name));

  const registrados = [];
  let baixados = 0;

  for (const meta of uteis) {
    if (baixados >= limite) {
      registrados.push({ tipo: 'nao-baixado', titulo: meta.display_name, url: meta.url });
      continue;
    }
    if (meta.size && meta.size > MAX_BYTES) {
      registrados.push({ tipo: 'arquivo-grande', titulo: meta.display_name, url: meta.url });
      continue;
    }
    const dest = await canvas.baixar(meta.url, destino, meta.display_name).catch(() => null);
    if (dest) {
      baixados++;
      registrados.push({ tipo: 'arquivo', titulo: meta.display_name, arquivo: path.relative(pastaCtx, dest) });
    }
  }
  return registrados;
}

async function salvarMateriais(canvas, curso, modulo, pastaCtx) {
  const destino = path.join(pastaCtx, 'materiais');
  const registrados = [];
  const idsArquivos = [];

  const itens = (modulo?.items || []).filter((i) => ['Page', 'File', 'ExternalUrl', 'ExternalTool'].includes(i.type));

  for (const item of itens) {
    if (item.type === 'Page' && item.page_url) {
      const pg = await canvas.pagina(curso.id, item.page_url).catch(() => null);
      if (!pg) continue;
      const md = `# ${pg.title}\n\n_Pagina do curso: ${cfg.baseUrl}/courses/${curso.id}/pages/${item.page_url}_\n\n` +
        htmlParaMarkdown(pg.body);
      garantirPasta(destino);
      const arq = path.join(destino, `${slug(pg.title) || 'pagina'}.md`);
      fs.writeFileSync(arq, md, 'utf8');
      registrados.push({ tipo: 'pagina', titulo: pg.title, arquivo: path.relative(pastaCtx, arq) });
      idsArquivos.push(...extrairArquivos(pg.body, cfg.baseUrl).map((r) => r.id));
    }

    if (item.type === 'File' && item.content_id != null) {
      idsArquivos.push(item.content_id);
    }

    if (item.type === 'ExternalUrl' || item.type === 'ExternalTool') {
      registrados.push({ tipo: 'link', titulo: item.title, url: item.external_url || item.html_url });
    }
  }

  registrados.push(...await baixarLote(canvas, idsArquivos, path.join(destino, 'anexos'), pastaCtx, MAX_ARQ));
  return registrados;
}

function textoRubrica(tarefa) {
  if (!tarefa.rubric || !tarefa.rubric.length) return '';
  const linhas = ['| Criterio | Pontos | O que se espera |', '|---|---|---|'];
  for (const c of tarefa.rubric) {
    const desc = htmlParaMarkdown(c.long_description || c.description || '').replace(/\s*\n\s*/g, ' ').trim();
    linhas.push(`| ${c.description || '-'} | ${c.points ?? '-'} | ${desc || '-'} |`);
  }
  return `\n## Rubrica de avaliacao\n\n${linhas.join('\n')}\n`;
}

/** Procura, entre as pastas ja criadas da materia, a que pertence a esta tarefa. */
function pastaExistenteDaTarefa(materia, tarefaId) {
  const dir = path.join(RAIZ, cfg.pastaEntregas, materia);
  if (!fs.existsSync(dir)) return null;

  for (const nome of fs.readdirSync(dir)) {
    const meta = path.join(dir, nome, '_contexto', 'meta.json');
    if (!fs.existsSync(meta)) continue;
    try {
      if (String(JSON.parse(fs.readFileSync(meta, 'utf8')).tarefaId) === String(tarefaId)) {
        return path.join(dir, nome);
      }
    } catch { /* meta ilegivel: segue procurando */ }
  }
  return null;
}

function classificar(curso, tarefa, modulo) {
  return {
    tipo: detectarTipo(tarefa.name),
    semana: detectarSemana({
      tituloTarefa: tarefa.name,
      tituloModulo: modulo?.name || '',
      inicioCurso: curso.start_at,
      referencia: tarefa.due_at ? new Date(tarefa.due_at) : AGORA,
    }),
  };
}

async function processarTarefa(canvas, curso, tarefa, modulo, materia, { tipo, semana, precisaSufixo }) {
  // Sem semana, ou com mais de uma entrega do mesmo tipo na semana, o nome
  // da tarefa entra na pasta para nao virar "Tarefa Semana 06" ambiguo.
  const base = semana ? `${tipo} Semana ${pad2(semana)}` : tipo;
  const rotulo = precisaSufixo || !semana ? `${base} - ${nomeSeguro(tarefa.name, 42)}` : base;

  // A pasta ja existente para esta tarefa manda, mesmo que o nome que sairia
  // hoje seja outro. O sufixo depende de quantas tarefas irmas estao pendentes
  // no momento da coleta, e isso muda de semana para semana: sem reaproveitar,
  // uma entrega ja escrita ficaria orfa numa pasta antiga.
  const pasta = pastaExistenteDaTarefa(materia, tarefa.id)
    || path.join(RAIZ, cfg.pastaEntregas, materia, nomeSeguro(rotulo, 75));

  const ctx = garantirPasta(path.join(pasta, '_contexto'));
  garantirPasta(path.join(pasta, 'entrega'));

  const materiais = await salvarMateriais(canvas, curso, modulo, ctx);

  // Anexos que vieram dentro do proprio enunciado
  const anexos = (await baixarLote(
    canvas,
    extrairArquivos(tarefa.description, cfg.baseUrl).map((r) => r.id),
    path.join(ctx, 'anexos'),
    ctx,
    MAX_ARQ
  )).filter((a) => a.tipo === 'arquivo');

  const enunciado = [
    `# ${tarefa.name}`,
    '',
    `- **Materia:** ${curso.name}`,
    `- **Modulo:** ${modulo?.name || 'nao identificado'}`,
    `- **Semana detectada:** ${semana ?? 'nao identificada'}`,
    `- **Tipo:** ${tipo}`,
    `- **Prazo:** ${formatarData(tarefa.due_at)}`,
    `- **Pontuacao:** ${tarefa.points_possible ?? 'nao informada'}`,
    `- **Formato de entrega:** ${(tarefa.submission_types || []).join(', ') || 'nao informado'}`,
    `- **Link:** ${tarefa.html_url}`,
    '',
    '## Enunciado (integra, como veio do Canvas)',
    '',
    htmlParaMarkdown(tarefa.description) || '_O professor nao escreveu descricao no Canvas. Use os materiais da semana._',
    textoRubrica(tarefa),
    '',
    '## Materiais da semana coletados',
    '',
    materiais.length
      ? materiais.map((m) => `- [${m.tipo}] ${m.titulo}${m.arquivo ? ` -> \`${m.arquivo}\`` : ''}${m.url ? ` (${m.url})` : ''}`).join('\n')
      : '_Nenhum material adicional encontrado no modulo._',
    '',
    anexos.length ? `## Anexos do enunciado\n\n${anexos.map((a) => `- ${a.titulo} -> \`${a.arquivo}\``).join('\n')}\n` : '',
  ].join('\n');

  fs.writeFileSync(path.join(ctx, 'enunciado.md'), enunciado, 'utf8');
  fs.writeFileSync(path.join(ctx, 'meta.json'), JSON.stringify({
    cursoId: curso.id,
    curso: curso.name,
    materia,
    tarefaId: tarefa.id,
    tarefa: tarefa.name,
    tipo,
    semana,
    prazo: tarefa.due_at,
    pontos: tarefa.points_possible,
    formatosEntrega: tarefa.submission_types,
    link: tarefa.html_url,
    modulo: modulo?.name || null,
    coletadoEm: AGORA.toISOString(),
    materiais,
    anexos,
  }, null, 2), 'utf8');

  return {
    materia,
    tarefa: tarefa.name,
    tipo,
    semana,
    prazo: tarefa.due_at,
    pontos: tarefa.points_possible,
    formatosEntrega: tarefa.submission_types,
    link: tarefa.html_url,
    pasta: path.relative(RAIZ, pasta).replace(/\\/g, '/'),
    contexto: path.relative(RAIZ, path.join(ctx, 'enunciado.md')).replace(/\\/g, '/'),
    automatizavel: !(cfg.ignorarTipos || []).includes(tipo),
  };
}

(async () => {
  const canvas = new Canvas({
    baseUrl: cfg.baseUrl,
    token: process.env.CANVAS_TOKEN,
    cookie: process.env.CANVAS_COOKIE,
  });

  const eu = await canvas.eu();
  log(`Canvas: conectado como ${eu.name}`);
  log(`Janela: ${INICIO.toLocaleDateString('pt-BR')} ate ${FIM.toLocaleDateString('pt-BR')}\n`);

  let cursos = await canvas.cursos();
  const soCurso = arg('curso');
  const incluir = (cfg.cursos?.incluir || []).map(String);
  const ignorar = (cfg.cursos?.ignorar || []).map(String);

  cursos = (cursos || []).filter((c) => {
    if (soCurso) return String(c.id) === String(soCurso);
    if (ignorar.includes(String(c.id))) return false;
    if (incluir.length) return incluir.includes(String(c.id));
    return true;
  });

  const fila = [];

  for (const curso of cursos) {
    const materia = materiaDe(curso, cfg.cursos?.apelidos);
    let tarefas;
    try {
      tarefas = await canvas.tarefas(curso.id);
    } catch (e) {
      log(`  ! ${materia}: nao foi possivel ler as tarefas (${e.message})`);
      continue;
    }

    const modulos = await canvas.modulos(curso.id).catch(() => []);
    const porTarefa = indexarModulos(modulos);

    const ignoradas = (cfg.ignorarTarefas || []).map(String);
    const pendentes = (tarefas || []).filter((t) => {
      // Entregas feitas fora do Canvas nao aparecem como submetidas na API.
      if (ignoradas.includes(String(t.id))) return false;
      if (!t.due_at) return false;
      const prazo = new Date(t.due_at);
      if (prazo < INICIO || prazo > FIM) return false;
      if (flag('todas')) return true;
      return !(t.submission && t.submission.submitted_at);
    });

    if (!pendentes.length) {
      log(`  - ${materia}: nada pendente na janela`);
      continue;
    }

    log(`  > ${materia}: ${pendentes.length} atividade(s)`);

    // Classifica tudo antes de criar pasta: so assim da para saber se duas
    // entregas caem no mesmo "<Tipo> Semana NN" e precisam do nome no fim.
    const classificadas = pendentes.map((t) => {
      const modulo = porTarefa.get(String(t.id));
      return { tarefa: t, modulo, ...classificar(curso, t, modulo) };
    });
    const contagem = new Map();
    for (const c of classificadas) {
      const chave = `${c.tipo}|${c.semana}`;
      contagem.set(chave, (contagem.get(chave) || 0) + 1);
    }

    for (const c of classificadas) {
      const precisaSufixo = contagem.get(`${c.tipo}|${c.semana}`) > 1;
      const item = await processarTarefa(canvas, curso, c.tarefa, c.modulo, materia, { ...c, precisaSufixo });
      fila.push(item);
      log(`      ${item.tipo} Semana ${item.semana ?? '?'} - ${c.tarefa.name}  ->  ${item.pasta}`);
    }
  }

  const pastaEntregas = garantirPasta(path.join(RAIZ, cfg.pastaEntregas));
  const arquivoFila = path.join(pastaEntregas, '_fila.json');
  fila.sort((a, b) => new Date(a.prazo) - new Date(b.prazo));
  fs.writeFileSync(arquivoFila, JSON.stringify({
    geradoEm: AGORA.toISOString(),
    janela: { de: INICIO.toISOString(), ate: FIM.toISOString() },
    total: fila.length,
    itens: fila,
  }, null, 2), 'utf8');

  log(`\n${fila.length} atividade(s) na fila -> ${path.relative(RAIZ, arquivoFila)}`);
  if (!fila.length) log('Nada a fazer nesta semana.');
})().catch((e) => {
  console.error('\nErro:', e.message);
  process.exit(1);
});
