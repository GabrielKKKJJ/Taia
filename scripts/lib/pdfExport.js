'use strict';
// Converte o .docx gerado em .pdf, usando o LibreOffice ja instalado na maquina.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const CAMINHOS_SOFFICE = [
  '/usr/bin/soffice',
  '/usr/bin/libreoffice',
  '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  'C:/Program Files/LibreOffice/program/soffice.exe',
  'C:/Program Files (x86)/LibreOffice/program/soffice.exe',
];

function acharSoffice() {
  if (process.env.SOFFICE_PATH && fs.existsSync(process.env.SOFFICE_PATH)) return process.env.SOFFICE_PATH;
  return CAMINHOS_SOFFICE.find((p) => fs.existsSync(p)) || 'soffice';
}

/**
 * Converte um .docx para .pdf na mesma pasta.
 * @param {string} caminhoDocx
 * @returns {{ok: boolean, saida?: string, erro?: string}}
 */
function converterParaPdf(caminhoDocx) {
  const executavel = acharSoffice();
  const pastaSaida = path.dirname(caminhoDocx);

  const r = spawnSync(executavel, [
    '--headless', '--norestore',
    '--convert-to', 'pdf',
    '--outdir', pastaSaida,
    caminhoDocx,
  ], { encoding: 'utf8', timeout: 60_000 });

  if (r.error) return { ok: false, erro: r.error.message };
  if (r.status !== 0) return { ok: false, erro: (r.stderr || r.stdout || `saida ${r.status}`).trim() };

  const saida = path.join(pastaSaida, path.basename(caminhoDocx, path.extname(caminhoDocx)) + '.pdf');
  if (!fs.existsSync(saida)) return { ok: false, erro: 'conversao rodou mas o .pdf nao apareceu' };

  return { ok: true, saida };
}

module.exports = { converterParaPdf, acharSoffice };
