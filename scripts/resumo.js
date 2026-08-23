'use strict';
/**
 * Monta o resumo da rodada a partir do que esta em disco: a fila coletada,
 * os vereditos dos revisores e as pendencias separadas dos documentos.
 *
 * Uso:
 *   node scripts/resumo.js                 (todas as atividades da fila)
 *   node scripts/resumo.js --semanas 6,7   (so as semanas indicadas)
 */
const fs = require('fs');
const path = require('path');
const { formatarData } = require('./lib/util');

const RAIZ = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'config.json'), 'utf8'));

const argv = process.argv.slice(2);
const arg = (nome) => {
  const i = argv.indexOf(`--${nome}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
};

const filtroSemanas = (arg('semanas') || '').split(',').map((s) => Number(s.trim())).filter(Boolean);

const arqFila = path.join(RAIZ, cfg.pastaEntregas, '_fila.json');
if (!fs.existsSync(arqFila)) {
  console.error('Sem _fila.json. Rode `npm run coletar` antes.');
  process.exit(1);
}
const fila = JSON.parse(fs.readFileSync(arqFila, 'utf8'));

const itens = fila.itens.filter((i) => !filtroSemanas.length || filtroSemanas.includes(i.semana));

/** Le o veredito gravado pelo revisor, se houver. */
function veredito(pasta) {
  const arq = path.join(RAIZ, pasta, '_revisao.md');
  if (!fs.existsSync(arq)) return { texto: '—', data: null };
  const t = fs.readFileSync(arq, 'utf8');
  const v = t.match(/\*\*Veredito:\*\*\s*([^\n*]+)/);
  const d = t.match(/\*\*Revisado em:\*\*\s*([^\n*]+)/);
  return {
    texto: v ? v[1].trim() : '—',
    data: d ? d[1].trim() : null,
    // Revisao anterior a ultima edicao do relatorio esta desatualizada.
    desatualizada: (() => {
      const rel = path.join(RAIZ, pasta, 'entrega', 'relatorio.md');
      if (!fs.existsSync(rel)) return false;
      return fs.statSync(rel).mtimeMs > fs.statSync(arq).mtimeMs + 60_000;
    })(),
  };
}

function pendencias(pasta) {
  const arq = path.join(RAIZ, pasta, '_pendencias.md');
  if (!fs.existsSync(arq)) return [];
  return fs.readFileSync(arq, 'utf8')
    .split(/^## /m).slice(1)
    .map((b) => {
      const linhas = b.split('\n');
      const titulo = linhas[0].replace(/^\d+\.\s*/, '').trim();
      if (titulo) return titulo;
      // Bloco sem titulo: cai para a primeira linha de conteudo.
      const corpo = linhas.slice(1).find((l) => l.trim()) || '';
      return corpo
        .replace(/^>?\s*\[?(PENDENTE|BLOQUEANTE)\]?:?\s*/i, '')
        .replace(/[[\]*`]/g, '')
        .trim()
        .slice(0, 90);
    })
    // Secoes informativas do arquivo nao sao pendencia.
    .filter((t) => t && !/^j[aá] resolvido/i.test(t));
}

function entregaveis(pasta) {
  const dir = path.join(RAIZ, pasta, 'entrega');
  if (!fs.existsSync(dir)) return [];
  const achados = [];
  (function anda(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) anda(p);
      else achados.push(path.relative(dir, p).replace(/\\/g, '/'));
    }
  })(dir);
  return achados;
}

const hoje = new Date();
const stamp = hoje.toISOString().slice(0, 10);

const linhas = [
  `# Rodada de ${hoje.toLocaleDateString('pt-BR')}`,
  '',
  `${itens.length} atividade(s)${filtroSemanas.length ? ` — semanas ${filtroSemanas.join(' e ')}` : ''}.`,
  '',
  '| Matéria | Atividade | Prazo | Pts | Revisão | Arquivos |',
  '|---|---|---|---|---|---|',
];

const semEntrega = [];
const todasPendencias = [];

for (const i of itens.sort((a, b) => new Date(a.prazo) - new Date(b.prazo))) {
  const arqs = entregaveis(i.pasta);
  const v = veredito(i.pasta);
  const p = pendencias(i.pasta);

  if (!arqs.length) semEntrega.push(i);
  if (p.length) todasPendencias.push({ item: i, lista: p });

  linhas.push([
    '',
    i.materia,
    i.tarefa.slice(0, 40),
    new Date(i.prazo).toLocaleDateString('pt-BR'),
    i.pontos ?? '—',
    v.texto + (v.desatualizada ? ' ⚠ desatualizada' : ''),
    arqs.length ? `${arqs.length}` : '**vazio**',
    '',
  ].join(' | ').replace(/^ \| /, '| ').replace(/ \| $/, ' |'));
}

if (todasPendencias.length) {
  linhas.push('', '## O que depende de você', '');
  for (const { item, lista } of todasPendencias) {
    linhas.push(`**${item.materia} — ${item.tarefa}**`, '');
    lista.forEach((l) => linhas.push(`- ${l}`));
    linhas.push('');
  }
}

if (semEntrega.length) {
  linhas.push('## Sem entrega produzida', '');
  semEntrega.forEach((i) => linhas.push(`- ${i.materia} — ${i.tarefa} (prazo ${formatarData(i.prazo)})`));
  linhas.push('');
}

const destino = path.join(RAIZ, cfg.pastaEntregas, `_RESUMO-${stamp}.md`);
fs.writeFileSync(destino, linhas.join('\n') + '\n', 'utf8');
console.log(`Resumo gravado em ${path.relative(RAIZ, destino)}`);
console.log(`  ${itens.length} atividades | ${todasPendencias.length} com pendencia | ${semEntrega.length} sem entrega`);
