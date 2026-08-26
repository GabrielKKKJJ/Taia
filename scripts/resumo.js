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
const { veredito, pendencias, entregavelDesatualizado, entregaveis } = require('./lib/status');

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
const desatualizados = [];

for (const i of itens.sort((a, b) => new Date(a.prazo) - new Date(b.prazo))) {
  const arqs = entregaveis(RAIZ, i.pasta);
  const v = veredito(RAIZ, i.pasta);
  const p = pendencias(RAIZ, i.pasta);
  const velho = entregavelDesatualizado(RAIZ, i.pasta);
  if (velho) desatualizados.push(i);

  if (!arqs.length) semEntrega.push(i);
  if (p.length) todasPendencias.push({ item: i, lista: p });

  linhas.push([
    '',
    i.materia,
    i.tarefa.slice(0, 40),
    new Date(i.prazo).toLocaleDateString('pt-BR'),
    i.pontos ?? '—',
    v.texto + (v.desatualizada ? ' ⚠ desatualizada' : ''),
    arqs.length ? (velho ? `${arqs.length} ⚠ regerar` : `${arqs.length}`) : '**vazio**',
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

if (desatualizados.length) {
  linhas.push(
    '## Atenção — .docx desatualizado',
    '',
    'O markdown foi editado depois da última geração do `.docx`. Rode',
    '`node scripts/relatorio.js "<pasta>"` nestas antes de entregar:',
    ''
  );
  desatualizados.forEach((i) => linhas.push(`- ${i.materia} — ${i.tarefa}`));
  linhas.push('');
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
if (desatualizados.length) console.log(`  ATENCAO: ${desatualizados.length} .docx desatualizado(s) — regere antes de entregar`);
