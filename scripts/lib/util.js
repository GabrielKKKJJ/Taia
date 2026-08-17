'use strict';
const fs = require('fs');
const path = require('path');

const ENTIDADES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '-', mdash: '--', hellip: '...', rsquo: "'", lsquo: "'",
  ldquo: '"', rdquo: '"', aacute: 'á', eacute: 'é', iacute: 'í',
  oacute: 'ó', uacute: 'ú', atilde: 'ã', otilde: 'õ', ccedil: 'ç',
  acirc: 'â', ecirc: 'ê', ocirc: 'ô', agrave: 'à',
};

function decodificarEntidades(s) {
  return String(s)
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => (n.toLowerCase() in ENTIDADES ? ENTIDADES[n.toLowerCase()] : m));
}

/** Nome de pasta/arquivo seguro no Windows, preservando acentos legiveis. */
function nomeSeguro(s, max = 60) {
  return decodificarEntidades(String(s))
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/[\x00-\x1f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/, '')
    .trim()
    .slice(0, max)
    .trim();
}

function slug(s, max = 40) {
  return decodificarEntidades(String(s))
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max);
}

const pad2 = (n) => String(n).padStart(2, '0');

function garantirPasta(p) {
  fs.mkdirSync(p, { recursive: true });
  return p;
}

/**
 * Descobre o numero da semana a partir do titulo da tarefa, do modulo
 * que a contem, ou (ultimo recurso) do tempo decorrido desde o inicio do curso.
 */
function detectarSemana({ tituloTarefa = '', tituloModulo = '', inicioCurso, referencia = new Date() }) {
  const explicito = [
    /sem(?:ana)?\s*[-_. ]?\s*(\d{1,2})/i,
    /week\s*[-_. ]?\s*(\d{1,2})/i,
    /\bm(?:odulo|ódulo|odule)\s*(\d{1,2})/i,
  ];
  // Prefixo de unidade: "6.4 Tarefas" -> 6. Nao casa "A.6" nem "B.6" de proposito.
  const unidade = /^\s*(\d{1,2})\.\d/;

  const achar = (texto, padroes) => {
    for (const p of padroes) {
      const m = String(texto).match(p);
      if (m) return Number(m[1]);
    }
    return null;
  };

  // O titulo da tarefa vem antes do modulo nos dois niveis: os nomes de modulo
  // do Canvas sao digitados a mao e erram (Programacao 6 tem dois "SEMANA 5",
  // e o segundo contem a unidade 6.4).
  return achar(tituloTarefa, explicito)
    ?? achar(tituloTarefa, [unidade])
    ?? achar(tituloModulo, explicito)
    ?? achar(tituloModulo, [unidade])
    ?? semanaPorData(inicioCurso, referencia);
}

function semanaPorData(inicioCurso, referencia) {
  if (inicioCurso) {
    const dias = (referencia - new Date(inicioCurso)) / 86400000;
    if (dias >= 0 && dias < 400) return Math.floor(dias / 7) + 1;
  }
  return null;
}

/** Classifica a entrega como Lab ou Tarefa a partir do titulo. */
function detectarTipo(titulo = '') {
  const t = String(titulo).toLowerCase();
  if (/\b(lab|laborat[oó]rio|laboratory|pr[aá]tica)\b/.test(t)) return 'Lab';
  if (/\b(projeto|project)\b/.test(t)) return 'Projeto';
  if (/\b(quiz|question[aá]rio|prova|exame)\b/.test(t)) return 'Quiz';
  return 'Tarefa';
}

/** Converte o HTML do Canvas em markdown legivel para o agente. */
function htmlParaMarkdown(html) {
  if (!html) return '';
  let s = String(html);

  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');

  // Tabelas viram blocos de texto simples (o Canvas usa tabelas para layout).
  s = s.replace(/<t[hd][^>]*>/gi, ' | ').replace(/<\/tr>/gi, '\n');
  s = s.replace(/<\/?(table|thead|tbody|tr)[^>]*>/gi, '\n');

  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/li>/gi, '\n');
  s = s.replace(/<\/(p|div|section|article|h[1-6]|blockquote|ul|ol)>/gi, '\n\n');

  s = s.replace(/<h1[^>]*>/gi, '\n# ');
  s = s.replace(/<h2[^>]*>/gi, '\n## ');
  s = s.replace(/<h3[^>]*>/gi, '\n### ');
  s = s.replace(/<h[456][^>]*>/gi, '\n#### ');
  s = s.replace(/<li[^>]*>/gi, '\n- ');

  s = s.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');
  s = s.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');
  s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');
  s = s.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, c) => '\n```\n' + c.replace(/<[^>]+>/g, '') + '\n```\n');

  s = s.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>/gi, '![$1]($2)');
  s = s.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![imagem]($1)');
  s = s.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, txt) => {
    const limpo = txt.replace(/<[^>]+>/g, '').trim();
    return limpo ? `[${limpo}](${href})` : href;
  });

  s = s.replace(/<[^>]+>/g, '');
  s = decodificarEntidades(s);

  return s
    .split('\n').map((l) => l.replace(/[ \t]+$/g, '').replace(/^[ \t]+/, (m) => (m.length > 3 ? '  ' : '')))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Extrai links de arquivos do Canvas presentes no HTML de um enunciado/pagina. */
function extrairArquivos(html, baseUrl) {
  if (!html) return [];
  const achados = new Map();
  const re = /(?:href|src|data-api-endpoint)="([^"]*\/(?:courses\/\d+\/)?files\/(\d+)[^"]*)"/gi;
  let m;
  while ((m = re.exec(html))) {
    const id = m[2];
    if (!achados.has(id)) {
      let url = decodificarEntidades(m[1]);
      if (url.startsWith('/')) url = baseUrl.replace(/\/$/, '') + url;
      achados.set(id, { id, url });
    }
  }
  return [...achados.values()];
}

// O Canvas serve o layout das paginas como arquivos: icones, banners e rodapes.
// Baixa-los enche a pasta e consome o limite, escondendo os slides de verdade.
const DECORATIVO = /^\s*\((icon|footer|header|banner|divider|logo|bg|background)\)/i;
const EXT_DESCARTAVEL = /\.(svg|ico|woff2?|ttf|eot|css|js\.map)$/i;
const EXT_DOCUMENTO = /\.(pdf|pptx?|docx?|xlsx?|csv|zip|rar|7z|ipynb|py|js|ts|tsx|java|cpp|c|cs|go|rs|sql|md|txt|json|xml|ya?ml|ino|drawio)$/i;
const EXT_IMAGEM = /\.(png|jpe?g|gif|webp|bmp)$/i;

/** Vale a pena baixar este anexo? Filtra a decoracao do tema do Canvas. */
function arquivoUtil(nome, tamanho = 0) {
  const n = String(nome || '');
  if (DECORATIVO.test(n) || EXT_DESCARTAVEL.test(n)) return false;
  if (EXT_DOCUMENTO.test(n)) return true;
  // Imagem so interessa se for grande o bastante para ser diagrama/print.
  if (EXT_IMAGEM.test(n)) return tamanho >= 50 * 1024;
  return true;
}

/** Documentos primeiro: se o limite cortar, corta o que menos importa. */
function prioridadeArquivo(nome) {
  const n = String(nome || '');
  if (/\.(pptx?|pdf)$/i.test(n)) return 0;  // slides da semana
  if (EXT_DOCUMENTO.test(n)) return 1;
  return 2;
}

function formatarData(iso) {
  if (!iso) return 'sem prazo definido';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' });
}

function carregarEnv(raiz) {
  const arq = path.join(raiz, '.env');
  if (!fs.existsSync(arq)) return;
  for (const linha of fs.readFileSync(arq, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (!m) continue;
    let v = m[2].trim().replace(/^["']|["']$/g, '');
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

module.exports = {
  decodificarEntidades, nomeSeguro, slug, pad2, garantirPasta,
  detectarSemana, detectarTipo, htmlParaMarkdown, extrairArquivos,
  arquivoUtil, prioridadeArquivo, formatarData, carregarEnv,
};
