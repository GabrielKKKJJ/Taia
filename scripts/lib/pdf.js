'use strict';
// Extrator de texto de PDF, suficiente para dar contexto de slides a um agente.
// Nao renderiza layout nem imagens: pega os operadores de texto de cada stream.
const zlib = require('zlib');

const OCTAL = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' };

function decodificarLiteral(s) {
  return s.replace(/\\(\d{1,3}|.)/g, (m, c) => {
    if (c in OCTAL) return OCTAL[c];
    if (/^\d+$/.test(c)) return String.fromCharCode(parseInt(c, 8));
    return c;
  });
}

function textoDoConteudo(buf) {
  const s = buf.toString('latin1');
  const saida = [];

  // TJ recebe um array com pedacos de texto e ajustes de kerning.
  const re = /\((?:[^()\\]|\\.)*\)|<([0-9A-Fa-f\s]+)>|\bTJ\b|\bTj\b|\bTD\b|\bTd\b|\bT\*\b|\bET\b/g;
  let m;
  let linha = '';

  while ((m = re.exec(s))) {
    const t = m[0];
    if (t.startsWith('(')) {
      linha += decodificarLiteral(t.slice(1, -1));
    } else if (t.startsWith('<')) {
      const hex = m[1].replace(/\s+/g, '');
      let txt = '';
      for (let i = 0; i + 3 < hex.length; i += 4) {
        const cod = parseInt(hex.slice(i, i + 4), 16);
        if (cod >= 32 && cod !== 0xfffd) txt += String.fromCharCode(cod);
      }
      linha += txt;
    } else if (t === 'TD' || t === 'Td' || t === 'T*' || t === 'ET') {
      if (linha.trim()) { saida.push(linha.trim()); linha = ''; }
    }
  }
  if (linha.trim()) saida.push(linha.trim());
  return saida;
}

/** Devolve o texto do PDF, uma entrada por bloco de texto encontrado. */
function extrairTextoPdf(buffer) {
  const s = buffer.toString('latin1');
  const partes = [];
  const re = /stream\r?\n?([\s\S]*?)endstream/g;
  let m;

  while ((m = re.exec(s))) {
    const bruto = Buffer.from(m[1], 'latin1');
    let conteudo = null;
    try {
      conteudo = zlib.inflateSync(bruto);
    } catch {
      try { conteudo = zlib.inflateRawSync(bruto); } catch { conteudo = null; }
    }
    if (!conteudo) continue;
    // Streams de conteudo tem operadores de texto; os de fonte/imagem nao.
    if (!/\bTj\b|\bTJ\b/.test(conteudo.toString('latin1'))) continue;
    partes.push(...textoDoConteudo(conteudo));
  }

  return partes
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l && !/^[\d\s.,:;()-]+$/.test(l));
}

module.exports = { extrairTextoPdf };

if (require.main === module) {
  const fs = require('fs');
  const arq = process.argv[2];
  if (!arq) { console.error('Uso: node scripts/lib/pdf.js <arquivo.pdf>'); process.exit(1); }
  console.log(extrairTextoPdf(fs.readFileSync(arq)).join('\n'));
}
