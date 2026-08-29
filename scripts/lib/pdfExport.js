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
 * Uma tentativa de converter o .docx para .pdf na mesma pasta.
 * @returns {{ok: boolean, saida?: string, erro?: string}}
 */
function tentarConverter(caminhoDocx) {
  const executavel = acharSoffice();
  const pastaSaida = path.dirname(caminhoDocx);
  const saida = path.join(pastaSaida, path.basename(caminhoDocx, path.extname(caminhoDocx)) + '.pdf');

  // O LibreOffice as vezes termina com codigo 0 sem regravar nada — sintoma
  // classico de outro soffice preso no mesmo perfil de usuario. So checar
  // "o arquivo existe" nao pega isso, porque o .pdf antigo continua la.
  const mtimeAntes = fs.existsSync(saida) ? fs.statSync(saida).mtimeMs : null;

  const r = spawnSync(executavel, [
    '--headless', '--norestore',
    '--convert-to', 'pdf',
    '--outdir', pastaSaida,
    caminhoDocx,
  ], { encoding: 'utf8', timeout: 60_000 });

  if (r.error) return { ok: false, erro: r.error.message };
  if (r.status !== 0) return { ok: false, erro: (r.stderr || r.stdout || `saida ${r.status}`).trim() };
  if (!fs.existsSync(saida)) return { ok: false, erro: 'conversao rodou mas o .pdf nao apareceu' };

  const mtimeDepois = fs.statSync(saida).mtimeMs;
  if (mtimeAntes !== null && mtimeDepois <= mtimeAntes) {
    return { ok: false, erro: 'o LibreOffice terminou sem erro mas nao regravou o .pdf — o arquivo antigo continua no lugar (provavel outro soffice preso no perfil)' };
  }

  return { ok: true, saida };
}

/**
 * Converte um .docx para .pdf, com uma segunda tentativa se a primeira
 * falhar — a falha silenciosa do LibreOffice costuma ser passageira.
 * @param {string} caminhoDocx
 * @returns {{ok: boolean, saida?: string, erro?: string}}
 */
function converterParaPdf(caminhoDocx) {
  const r1 = tentarConverter(caminhoDocx);
  if (r1.ok) return r1;

  const r2 = tentarConverter(caminhoDocx);
  if (r2.ok) return r2;

  return { ok: false, erro: `${r2.erro} (falhou 2x)` };
}

module.exports = { converterParaPdf, acharSoffice };
