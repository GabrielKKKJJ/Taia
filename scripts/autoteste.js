'use strict';
/**
 * Autoteste offline: valida o gerador de .docx e os utilitarios sem tocar no Canvas.
 * Uso: npm run teste
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { lerZip, escreverZip } = require('./lib/zip');
const { gerarDocx } = require('./lib/docx');
const util = require('./lib/util');

const RAIZ = path.resolve(__dirname, '..');
let falhas = 0;

function ok(nome, condicao, detalhe = '') {
  const marca = condicao ? 'ok  ' : 'FALHA';
  if (!condicao) falhas++;
  console.log(`  ${marca} ${nome}${detalhe ? ` — ${detalhe}` : ''}`);
}

console.log('\nZIP');
{
  const original = [{ nome: 'a.txt', dados: Buffer.from('conteúdo com acento') }, { nome: 'p/b.bin', dados: Buffer.from([0, 1, 2, 255]) }];
  const volta = lerZip(escreverZip(original));
  ok('round-trip preserva nomes', volta.map((e) => e.nome).join() === 'a.txt,p/b.bin');
  ok('round-trip preserva bytes', volta[0].dados.toString() === 'conteúdo com acento' && volta[1].dados[3] === 255);
}

console.log('\nUtilitarios');
{
  ok('detectarSemana pelo titulo', util.detectarSemana({ tituloTarefa: 'Laboratório da Semana 6' }) === 6);
  ok('detectarSemana pelo modulo', util.detectarSemana({ tituloModulo: 'Week 4 - Redes' }) === 4);
  ok('detectarSemana pelo prefixo de unidade', util.detectarSemana({ tituloTarefa: '6.4 Tarefas' }) === 6);
  // Caso real: Programacao 6 tem dois modulos "SEMANA 5"; a unidade 6.4 esta no segundo.
  ok('titulo da tarefa vence modulo errado', util.detectarSemana({
    tituloTarefa: '6.4 Tarefas',
    tituloModulo: 'MASTERCLASS GRUPO A: SEMANA 5: Protocolos em Tempo Real Parte 2',
  }) === 6);
  ok('prefixo com letra nao vira semana', util.detectarSemana({ tituloTarefa: 'A.6 Laboratório Semana 6' }) === 6);
  ok('sem pista nenhuma devolve null', util.detectarSemana({ tituloTarefa: 'Capstone Mid Term' }) === null);
  ok('arquivoUtil descarta decoracao', !util.arquivoUtil('(Icon) Warning.png', 9999) && !util.arquivoUtil('logo.svg', 9999));
  ok('arquivoUtil mantem slides', util.arquivoUtil('Semana 6 - slides.pdf', 900000));
  ok('prioridade: slides na frente', util.prioridadeArquivo('aula.pdf') < util.prioridadeArquivo('foto.png'));
  ok('detectarTipo lab', util.detectarTipo('Laboratório 2 - Sensores') === 'Lab');
  ok('detectarTipo tarefa', util.detectarTipo('Atividade 5') === 'Tarefa');
  ok('nomeSeguro remove ilegais', !/[\\/:*?"<>|]/.test(util.nomeSeguro('Lab 3: a/b?')));
  ok('htmlParaMarkdown titulos', util.htmlParaMarkdown('<h2>Meta</h2>').startsWith('## Meta'));
  ok('htmlParaMarkdown entidades', util.htmlParaMarkdown('<p>Fa&ccedil;a</p>') === 'Faça');
  const arqs = util.extrairArquivos('<a href="/courses/1067/files/42/download">slide</a>', 'https://lms.jala.university');
  ok('extrairArquivos acha o id', arqs.length === 1 && arqs[0].id === '42');
}

console.log('\nGerador de .docx');
{
  const template = path.join(RAIZ, JSON.parse(fs.readFileSync(path.join(RAIZ, 'config.json'), 'utf8')).template);
  if (!fs.existsSync(template)) {
    ok('template presente', false, template);
  } else {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'taia-'));
    const saida = path.join(tmp, 'r.docx');
    const md = [
      '## Objetivo', '', 'Testar **negrito**, *italico* e `codigo`.', '',
      '- item um', '- item dois', '', '1. passo um', '', '```js', 'const x = 1;', '```', '',
      '| A | B |', '|---|---|', '| 1 | 2 |', '', '> nota', '', '---', '',
      'Texto com & e < que precisam de escape.',
    ].join('\n');

    gerarDocx({ template, saida, titulo: 'Laboratório 6 - IoT', atividade: 'Telemetria', markdown: md, baseImagens: tmp });

    const partes = lerZip(fs.readFileSync(saida));
    const doc = partes.find((p) => p.nome === 'word/document.xml').dados.toString('utf8');

    ok('arquivo gerado', fs.existsSync(saida) && fs.statSync(saida).size > 1000);
    ok('placeholder do titulo substituido', !doc.includes('[Tarefa ou Labortatorio x]'));
    ok('placeholder do corpo substituido', !doc.includes('[atividade]'));
    ok('titulo aplicado', doc.includes('Laboratório 6 - IoT'));
    ok('tabela gerada', doc.includes('<w:tbl>'));
    ok('capa preservada', doc.includes('Uso Acadêmico Exclusivo') && partes.some((p) => p.nome === 'word/media/image1.png'));
    ok('escape de XML', doc.includes('&amp;') && !/[^&]&(?![a-z]+;|#)/.test(doc.replace(/&(amp|lt|gt|quot|apos);/g, '')));
    ok('sectPr continua no fim', doc.lastIndexOf('<w:sectPr>') > doc.lastIndexOf('<w:tbl>'));

    for (const tag of ['w:p', 'w:r', 'w:tbl', 'w:tr', 'w:tc']) {
      const abre = (doc.match(new RegExp(`<${tag}[ >]`, 'g')) || []).length;
      const fecha = (doc.match(new RegExp(`</${tag}>`, 'g')) || []).length;
      ok(`tags <${tag}> balanceadas`, abre === fecha, `${abre} vs ${fecha}`);
    }

    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

console.log(falhas ? `\n${falhas} falha(s).\n` : '\nTudo certo.\n');
process.exit(falhas ? 1 : 0);
