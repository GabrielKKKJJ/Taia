'use strict';
// Le do disco o estado de uma atividade (revisao, pendencias, entregaveis).
// Usado pelo resumo.js e pelo painel web — a mesma leitura, dois consumidores.
const fs = require('fs');
const path = require('path');

/** Le o veredito gravado pelo revisor, se houver. */
function veredito(raiz, pasta) {
  const arq = path.join(raiz, pasta, '_revisao.md');
  if (!fs.existsSync(arq)) return { texto: '—', data: null, desatualizada: false };
  const t = fs.readFileSync(arq, 'utf8');
  const v = t.match(/\*\*Veredito:\*\*\s*([^\n*]+)/);
  const d = t.match(/\*\*Revisado em:\*\*\s*([^\n*]+)/);
  return {
    texto: v ? v[1].trim() : '—',
    data: d ? d[1].trim() : null,
    // Revisao anterior a ultima edicao do relatorio esta desatualizada.
    desatualizada: (() => {
      const rel = path.join(raiz, pasta, 'entrega', 'relatorio.md');
      if (!fs.existsSync(rel)) return false;
      return fs.statSync(rel).mtimeMs > fs.statSync(arq).mtimeMs + 60_000;
    })(),
  };
}

function pendencias(raiz, pasta) {
  const arq = path.join(raiz, pasta, '_pendencias.md');
  if (!fs.existsSync(arq)) return [];
  return fs.readFileSync(arq, 'utf8')
    .split(/^## /m).slice(1)
    .map((b) => {
      const linhas = b.split('\n');
      const titulo = linhas[0].replace(/^\d+\.\s*/, '').trim();
      if (titulo) return titulo;
      const corpo = linhas.slice(1).find((l) => l.trim()) || '';
      return corpo
        .replace(/^>?\s*\[?(PENDENTE|BLOQUEANTE)\]?:?\s*/i, '')
        .replace(/[[\]*`]/g, '')
        .trim()
        .slice(0, 90);
    })
    .filter((t) => t && !/^j[aá] resolvido/i.test(t));
}

/**
 * O .docx/.pdf sao gerados a partir do relatorio.md. Se o markdown foi editado
 * depois, o arquivo que seria entregue esta desatualizado.
 */
function entregavelDesatualizado(raiz, pasta) {
  const dir = path.join(raiz, pasta, 'entrega');
  const rel = path.join(dir, 'relatorio.md');
  if (!fs.existsSync(dir) || !fs.existsSync(rel)) return false;

  const gerados = fs.readdirSync(dir).filter((f) => f.endsWith('.docx') || f.endsWith('.pdf'));
  if (!gerados.length) return false;

  const md = fs.statSync(rel).mtimeMs;
  return gerados.some((f) => fs.statSync(path.join(dir, f)).mtimeMs + 1000 < md);
}

function entregaveis(raiz, pasta) {
  const dir = path.join(raiz, pasta, 'entrega');
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

/** Rotulo de status unico, na ordem de prioridade que mais importa ver primeiro. */
function rotuloStatus({ arquivos, verd, pend, desatualizado }) {
  if (!arquivos.length) return 'sem-entrega';
  if (/reprovad/i.test(verd.texto)) return 'reprovado';
  if (desatualizado) return 'desatualizado';
  if (pend.length) return 'pendencia';
  if (verd.texto === '—') return 'aguardando-revisao';
  if (verd.desatualizada) return 'revisao-desatualizada';
  return 'pronto';
}

/** Monta o pacote de status de uma atividade a partir da pasta (relativa a raiz). */
function statusDaAtividade(raiz, pasta) {
  const arquivos = entregaveis(raiz, pasta);
  const verd = veredito(raiz, pasta);
  const pend = pendencias(raiz, pasta);
  const desatualizado = entregavelDesatualizado(raiz, pasta);
  return {
    pasta,
    arquivos,
    veredito: verd,
    pendencias: pend,
    desatualizado,
    status: rotuloStatus({ arquivos, verd, pend, desatualizado }),
  };
}

module.exports = {
  veredito, pendencias, entregavelDesatualizado, entregaveis, statusDaAtividade, rotuloStatus,
};
