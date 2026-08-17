'use strict';
/**
 * Converte entrega/relatorio.md no .docx no template da faculdade.
 *
 * Faz duas coisas antes de gerar:
 *  - renderiza blocos ```mermaid em PNG e os embute como figura;
 *  - retira do documento qualquer bloco de pendencia e o move para _pendencias.md,
 *    porque pendencia e recado para o aluno, nao conteudo para o professor.
 *
 * Uso:
 *   node scripts/relatorio.js "entregas/IoT/Lab Semana 06"
 *   node scripts/relatorio.js "entregas/IoT/Lab Semana 06" --md outro.md --saida final.docx
 *
 * Cabecalho opcional no topo do markdown (sobrescreve o meta.json):
 *   ---
 *   titulo: Laboratorio 6 - Internet das Coisas
 *   atividade: Telemetria com MQTT
 *   ---
 */
const fs = require('fs');
const path = require('path');
const { gerarDocx } = require('./lib/docx');
const { renderizarDiagramas } = require('./lib/mermaid');
const { nomeSeguro, pad2 } = require('./lib/util');

const RAIZ = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'config.json'), 'utf8'));

const argv = process.argv.slice(2);
const arg = (nome, padrao) => {
  const i = argv.indexOf(`--${nome}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : padrao;
};

const posicionais = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
const alvo = posicionais[0];
if (!alvo) {
  console.error('Uso: node scripts/relatorio.js "entregas/<Materia>/<Pasta da atividade>"');
  process.exit(1);
}

let pasta = path.resolve(RAIZ, alvo);
if (!fs.existsSync(pasta) && posicionais.length > 1) {
  pasta = path.resolve(RAIZ, posicionais.join(' '));
}
if (!fs.existsSync(pasta)) {
  console.error(`Pasta da atividade nao encontrada: ${pasta}`);
  process.exit(1);
}

const arqMd = path.resolve(pasta, arg('md', 'entrega/relatorio.md'));
if (!fs.existsSync(arqMd)) {
  console.error(`Nao encontrei o relatorio: ${arqMd}`);
  process.exit(1);
}

const MARCADOR_PENDENCIA = /\[(PENDENTE|BLOQUEANTE|IMPORTANTE|MENOR|TODO)\b/i;

/**
 * Remove blocos de citacao que sao pendencia e devolve o texto limpo + o que saiu.
 * Se uma secao ficar sem conteudo depois disso, o titulo dela tambem sai.
 */
function separarPendencias(markdown) {
  const linhas = markdown.split('\n');
  const mantidas = [];
  const pendencias = [];
  let i = 0;

  while (i < linhas.length) {
    if (/^\s*>/.test(linhas[i])) {
      const bloco = [];
      while (i < linhas.length && (/^\s*>/.test(linhas[i]) || (bloco.length && !linhas[i].trim()))) {
        if (!linhas[i].trim() && !/^\s*>/.test(linhas[i + 1] || '')) break;
        bloco.push(linhas[i++]);
      }
      const texto = bloco.join('\n');
      if (MARCADOR_PENDENCIA.test(texto)) {
        pendencias.push(texto.replace(/^\s*>\s?/gm, '').trim());
        while (i < linhas.length && !linhas[i].trim()) i++;
        continue;
      }
      mantidas.push(...bloco);
      continue;
    }
    mantidas.push(linhas[i++]);
  }

  // Descarta titulos que ficaram sem corpo.
  const saida = [];
  for (let k = 0; k < mantidas.length; k++) {
    const m = mantidas[k].match(/^(#{2,4})\s/);
    if (m) {
      let j = k + 1;
      let vazio = true;
      while (j < mantidas.length && !/^#{2,4}\s/.test(mantidas[j])) {
        if (mantidas[j].trim()) { vazio = false; break; }
        j++;
      }
      if (vazio) continue;
    }
    saida.push(mantidas[k]);
  }

  return {
    limpo: saida.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n',
    pendencias,
  };
}

/** Acha blocos ```mermaid e devolve os itens a renderizar. */
function extrairMermaid(markdown, pastaAssets) {
  const blocos = [];
  const re = /^[ \t]*```mermaid[ \t]*(.*)$\n([\s\S]*?)^[ \t]*```[ \t]*$/gm;
  let m;
  while ((m = re.exec(markdown))) {
    blocos.push({
      original: m[0],
      legenda: (m[1] || '').trim(),
      codigo: m[2],
      saida: path.join(pastaAssets, `diagrama${blocos.length + 1}.png`),
    });
  }
  return blocos;
}

(async () => {
  let meta = {};
  const arqMeta = path.join(pasta, '_contexto', 'meta.json');
  if (fs.existsSync(arqMeta)) meta = JSON.parse(fs.readFileSync(arqMeta, 'utf8'));

  let markdown = fs.readFileSync(arqMd, 'utf8');

  const frente = {};
  const mFrente = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  if (mFrente) {
    for (const linha of mFrente[1].split('\n')) {
      const m = linha.match(/^\s*([a-zA-Z]+)\s*:\s*(.+)$/);
      if (m) frente[m[1].toLowerCase()] = m[2].trim();
    }
    markdown = markdown.slice(mFrente[0].length);
  }

  // 1) Pendencias saem do documento e viram arquivo separado.
  const { limpo, pendencias } = separarPendencias(markdown);
  markdown = limpo;

  const arqPendencias = path.join(pasta, '_pendencias.md');
  if (pendencias.length) {
    fs.writeFileSync(arqPendencias, [
      `# Pendencias — ${meta.tarefa || path.basename(pasta)}`,
      '',
      '_Retiradas automaticamente do relatorio: nao aparecem no .docx entregue._',
      '',
      ...pendencias.map((p, i) => `## ${i + 1}.\n\n${p}\n`),
    ].join('\n'), 'utf8');
  } else if (fs.existsSync(arqPendencias)) {
    fs.unlinkSync(arqPendencias);
  }

  // 2) Diagramas mermaid viram PNG.
  const pastaAssets = path.join(path.dirname(arqMd), 'assets');
  const blocos = extrairMermaid(markdown, pastaAssets);
  let diagramasOk = 0;
  const falhas = [];

  if (blocos.length) {
    const resultados = await renderizarDiagramas(blocos.map((b) => ({ codigo: b.codigo, saida: b.saida })));
    blocos.forEach((bloco, i) => {
      const r = resultados[i];
      if (r && r.ok) {
        diagramasOk++;
        const rel = path.relative(path.dirname(arqMd), bloco.saida).replace(/\\/g, '/');
        markdown = markdown.replace(bloco.original, `![${bloco.legenda}](${rel})`);
      } else {
        falhas.push(r ? r.erro : 'erro desconhecido');
        // Sem imagem, preserva o codigo como bloco de texto em vez de sumir com o diagrama.
        markdown = markdown.replace(bloco.original, '```\n' + bloco.codigo + '```');
      }
    });
  }

  const rotuloTipo = { Lab: 'Laboratório', Tarefa: 'Tarefa', Projeto: 'Projeto', Quiz: 'Questionário' }[meta.tipo] || 'Atividade';
  const titulo = frente.titulo || `${rotuloTipo}${meta.semana ? ` ${meta.semana}` : ''} - ${meta.curso || cfg.aluno}`;
  const atividade = frente.atividade || meta.tarefa || 'Atividade';

  const nomeArquivo = nomeSeguro(
    `${meta.tipo || 'Atividade'}${meta.semana ? ` Semana ${pad2(meta.semana)}` : ''} - ${meta.materia || ''}`.trim(),
    70
  ) + '.docx';
  const saida = path.resolve(pasta, arg('saida', path.join('entrega', nomeArquivo)));

  const r = gerarDocx({
    template: path.resolve(RAIZ, cfg.template),
    saida,
    titulo,
    atividade,
    markdown,
    baseImagens: path.dirname(arqMd),
  });

  console.log(`Relatorio gerado: ${path.relative(RAIZ, r.saida)}`);
  console.log(`  Titulo da capa: ${titulo}`);
  console.log(`  Atividade:      ${atividade}`);
  if (blocos.length) console.log(`  Diagramas mermaid: ${diagramasOk}/${blocos.length} renderizados`);
  falhas.forEach((f) => console.log(`  ! diagrama falhou: ${f}`));
  if (r.imagens) console.log(`  Imagens embutidas: ${r.imagens}`);
  if (pendencias.length) {
    console.log(`  ${pendencias.length} pendencia(s) retiradas do documento -> ${path.relative(RAIZ, arqPendencias)}`);
  }
})().catch((e) => {
  console.error('Erro:', e.message);
  process.exit(1);
});
