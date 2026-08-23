'use strict';
// Preenche o template .docx da faculdade a partir de markdown.
// Mantem intacta a capa (logo, "Uso Academico Exclusivo", nome do aluno).
const fs = require('fs');
const path = require('path');
const { lerZip, escreverZip } = require('./zip');
const { realcar } = require('./realce');

const PLACEHOLDER_TITULO = '[Tarefa ou Labortatorio x] - [Materia]';
const PLACEHOLDER_CORPO = '[atividade]';

const FONTE = 'Open Sans';
const FONTE_MONO = 'Consolas';
const LARGURA_MAX_EMU = 5400000; // ~ largura util da pagina A4 com margens padrao

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');

function rPr({ negrito, italico, mono, tam = 24, cor = '000000', realce } = {}) {
  const f = mono ? FONTE_MONO : FONTE;
  return '<w:rPr>' +
    `<w:rFonts w:ascii="${f}" w:hAnsi="${f}" w:cs="${f}" w:eastAsia="${f}"/>` +
    (negrito ? '<w:b/><w:bCs/>' : '') +
    (italico ? '<w:i/><w:iCs/>' : '') +
    `<w:color w:val="${cor}"/>` +
    (realce ? `<w:shd w:val="clear" w:fill="${realce}"/>` : '') +
    `<w:sz w:val="${tam}"/><w:szCs w:val="${tam}"/>` +
    '</w:rPr>';
}

function run(texto, estilo) {
  return `<w:r>${rPr(estilo)}<w:t xml:space="preserve">${esc(texto)}</w:t></w:r>`;
}

function par(conteudo, { alinhar = 'start', recuo = 0, antes = 120, depois = 120, linha = 276, fundo, borda } = {}) {
  return '<w:p><w:pPr>' +
    `<w:spacing w:after="${depois}" w:before="${antes}" w:line="${linha}" w:lineRule="auto"/>` +
    `<w:ind w:firstLine="0" w:start="${recuo}"/>` +
    `<w:jc w:val="${alinhar}"/>` +
    (fundo ? `<w:shd w:val="clear" w:fill="${fundo}"/>` : '') +
    (borda ? '<w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="C7C7C7"/></w:pBdr>' : '') +
    '</w:pPr>' + conteudo + '</w:p>';
}

/** Converte marcacao inline (**negrito**, *italico*, `codigo`, [texto](url)) em runs. */
function inline(texto, base = {}) {
  const partes = [];
  let resto = String(texto);
  const padrao = /(\*\*|__)(.+?)\1|(\*|_)(.+?)\3|`([^`]+)`|\[([^\]]*)\]\(([^)]+)\)/;

  while (resto) {
    const m = resto.match(padrao);
    if (!m) { partes.push(run(resto, base)); break; }
    if (m.index > 0) partes.push(run(resto.slice(0, m.index), base));

    if (m[2] !== undefined) partes.push(run(m[2], { ...base, negrito: true }));
    else if (m[4] !== undefined) partes.push(run(m[4], { ...base, italico: true }));
    else if (m[5] !== undefined) partes.push(run(m[5], { ...base, mono: true, realce: 'F2F2F2' }));
    else {
      const rotulo = m[6] || m[7];
      partes.push(run(rotulo, { ...base, cor: '1155CC' }));
      if (m[6] && m[7] && m[6] !== m[7]) partes.push(run(` (${m[7]})`, { ...base, tam: 20, cor: '666666' }));
    }
    resto = resto.slice(m.index + m[0].length);
  }
  return partes.join('');
}

function dimensoesImagem(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { largura: buf.readUInt32BE(16), altura: buf.readUInt32BE(20) };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marcador = buf[i + 1];
      if (marcador >= 0xc0 && marcador <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marcador)) {
        return { altura: buf.readUInt16BE(i + 5), largura: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return { largura: 600, altura: 400 };
}

/**
 * Bloco de codigo: uma tabela de celula unica, com borda e fundo.
 *
 * Tabela em vez de paragrafos soltos porque so ela produz a caixa continua —
 * paragrafos com sombreamento deixam faixas brancas entre as linhas. O texto
 * segue selecionavel e pesquisavel, ao contrario de uma imagem.
 */
function blocoCodigo(codigo, idioma) {
  const linhas = realcar(codigo, idioma);

  const paragrafos = linhas.map((tokens, i) => {
    const runs = tokens.map((t) =>
      run(t.texto || ' ', { mono: true, tam: 18, cor: t.cor, italico: t.italico })
    ).join('');
    return '<w:p><w:pPr>' +
      `<w:spacing w:after="0" w:before="${i === 0 ? 40 : 0}" w:line="240" w:lineRule="auto"/>` +
      '<w:ind w:firstLine="0" w:start="0"/><w:jc w:val="start"/>' +
      '</w:pPr>' + runs + '</w:p>';
  }).join('');

  const rotulo = idioma
    ? '<w:p><w:pPr><w:spacing w:after="40" w:before="0" w:line="240" w:lineRule="auto"/>' +
      '<w:jc w:val="end"/></w:pPr>' +
      run(idioma, { mono: true, tam: 15, cor: '8B949E' }) + '</w:p>'
    : '';

  return '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>' +
    '<w:tblBorders>' +
    ['top', 'left', 'bottom', 'right']
      .map((b) => `<w:${b} w:val="single" w:sz="4" w:space="0" w:color="D8DEE4"/>`).join('') +
    '</w:tblBorders>' +
    '<w:tblCellMar>' +
    '<w:top w:w="80" w:type="dxa"/><w:left w:w="140" w:type="dxa"/>' +
    '<w:bottom w:w="80" w:type="dxa"/><w:right w:w="140" w:type="dxa"/>' +
    '</w:tblCellMar></w:tblPr>' +
    '<w:tr><w:tc><w:tcPr><w:tcW w:w="5000" w:type="pct"/>' +
    '<w:shd w:val="clear" w:fill="F6F8FA"/></w:tcPr>' +
    rotulo + paragrafos +
    '</w:tc></w:tr></w:tbl>' +
    par('', { antes: 0, depois: 60 });   // respiro depois da caixa
}

function celula(conteudo, { cabecalho = false, larguraPct } = {}) {
  return '<w:tc><w:tcPr>' +
    (larguraPct ? `<w:tcW w:w="${larguraPct}" w:type="pct"/>` : '') +
    (cabecalho ? '<w:shd w:val="clear" w:fill="EFEFEF"/>' : '') +
    '</w:tcPr>' +
    par(inline(conteudo, { negrito: cabecalho, tam: 22 }), { antes: 40, depois: 40 }) +
    '</w:tc>';
}

function tabela(linhas) {
  const pct = Math.floor(5000 / Math.max(1, linhas[0].length));
  const corpo = linhas.map((cels, i) =>
    '<w:tr>' + cels.map((c) => celula(c, { cabecalho: i === 0, larguraPct: pct })).join('') + '</w:tr>'
  ).join('');
  return '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>' +
    '<w:tblBorders>' +
    ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
      .map((b) => `<w:${b} w:val="single" w:sz="6" w:space="0" w:color="BFBFBF"/>`).join('') +
    '</w:tblBorders></w:tblPr>' + corpo + '</w:tbl>';
}

/**
 * markdown -> WordprocessingML.
 * @returns {{xml: string, imagens: Array<{arquivo: string, rid: string}>}}
 */
function markdownParaWml(md, { baseImagens, proximoRid }) {
  const linhas = String(md).replace(/\r\n/g, '\n').split('\n');
  const saida = [];
  const imagens = [];
  let i = 0;

  const TAM = { 1: 36, 2: 30, 3: 26, 4: 24 };

  while (i < linhas.length) {
    const linha = linhas[i];

    // bloco de codigo
    if (/^\s*```/.test(linha)) {
      const idioma = linha.replace(/^\s*```/, '').trim();
      const buf = [];
      i++;
      while (i < linhas.length && !/^\s*```/.test(linhas[i])) buf.push(linhas[i++]);
      i++;
      saida.push(blocoCodigo(buf.join('\n'), idioma));
      continue;
    }

    // tabela
    if (/^\s*\|.*\|\s*$/.test(linha) && /^\s*\|[\s:|-]+\|\s*$/.test(linhas[i + 1] || '')) {
      const corta = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const linhasTab = [corta(linha)];
      i += 2;
      while (i < linhas.length && /^\s*\|.*\|\s*$/.test(linhas[i])) linhasTab.push(corta(linhas[i++]));
      saida.push(tabela(linhasTab));
      saida.push(par('', { antes: 0, depois: 0 }));
      continue;
    }

    // imagem sozinha na linha
    const img = linha.match(/^\s*!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (img) {
      const alvo = path.resolve(baseImagens || '.', img[2].trim());
      if (fs.existsSync(alvo)) {
        const buf = fs.readFileSync(alvo);
        const { largura, altura } = dimensoesImagem(buf);
        const cx = Math.min(LARGURA_MAX_EMU, largura * 9525);
        const cy = Math.round((cx / largura) * altura);
        const rid = `rIdImg${proximoRid + imagens.length}`;
        const id = 100 + imagens.length;
        imagens.push({ arquivo: alvo, rid });
        saida.push(par(
          `<w:r><w:drawing><wp:inline><wp:extent cx="${cx}" cy="${cy}"/>` +
          `<wp:docPr id="${id}" name="Imagem ${id}" descr="${esc(img[1])}"/>` +
          '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="true"/></wp:cNvGraphicFramePr>' +
          '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
          '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
          `<pic:nvPicPr><pic:cNvPr id="${id}" name="Imagem ${id}"/><pic:cNvPicPr/></pic:nvPicPr>` +
          `<pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
          `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
          '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
          '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>',
          { alinhar: 'center', antes: 160, depois: 40 }
        ));
        if (img[1]) saida.push(par(inline(img[1], { tam: 19, italico: true, cor: '555555' }), { alinhar: 'center', antes: 0, depois: 160 }));
      } else {
        saida.push(par(run(`[imagem nao encontrada: ${img[2]}]`, { italico: true, cor: 'B00020' }), { alinhar: 'center' }));
      }
      i++;
      continue;
    }

    // titulo
    const h = linha.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const nivel = h[1].length;
      saida.push(par(inline(h[2], { negrito: true, tam: TAM[nivel] }), { antes: nivel === 1 ? 320 : 240, depois: 120 }));
      i++;
      continue;
    }

    // regua
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(linha)) {
      saida.push('<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="CCCCCC"/></w:pBdr></w:pPr></w:p>');
      i++;
      continue;
    }

    // citacao
    if (/^\s*>\s?/.test(linha)) {
      saida.push(par(inline(linha.replace(/^\s*>\s?/, ''), { italico: true, cor: '444444' }), { recuo: 320, borda: true }));
      i++;
      continue;
    }

    // lista com marcador ou numerada (niveis por indentacao)
    const li = linha.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (li) {
      const nivel = Math.min(2, Math.floor(li[1].length / 2));
      const marca = /^\d/.test(li[2]) ? `${li[2].replace(/[.)]$/, '')}. ` : (nivel === 0 ? '•  ' : '◦  ');
      saida.push(par(
        run(marca, {}) + inline(li[3]),
        { recuo: 360 + nivel * 360, antes: 40, depois: 40 }
      ));
      i++;
      continue;
    }

    // linha em branco
    if (!linha.trim()) { i++; continue; }

    // paragrafo comum (junta linhas ate a proxima quebra)
    const buf = [linha];
    i++;
    while (i < linhas.length && linhas[i].trim() && !/^(\s*[-*+]\s|\s*\d+[.)]\s|#{1,4}\s|\s*```|\s*>|\s*\|)/.test(linhas[i])) {
      buf.push(linhas[i++]);
    }
    saida.push(par(inline(buf.join(' ')), { alinhar: 'both' }));
  }

  return { xml: saida.join(''), imagens };
}

/**
 * Gera o .docx final a partir do template.
 * @param {object} o
 * @param {string} o.template   caminho do template .docx
 * @param {string} o.saida      caminho do .docx a gravar
 * @param {string} o.titulo     substitui "[Tarefa ou Labortatorio x] - [Materia]"
 * @param {string} o.atividade  substitui "[atividade]" (titulo grande da atividade)
 * @param {string} o.markdown   corpo do relatorio
 * @param {string} [o.baseImagens] pasta base para resolver caminhos de imagem
 */
function gerarDocx({ template, saida, titulo, atividade, markdown, baseImagens }) {
  if (!fs.existsSync(template)) throw new Error(`Template nao encontrado: ${template}`);
  const entradas = lerZip(fs.readFileSync(template));

  const pega = (nome) => entradas.find((e) => e.nome === nome);
  const doc = pega('word/document.xml');
  const rels = pega('word/_rels/document.xml.rels');
  const tipos = pega('[Content_Types].xml');
  if (!doc) throw new Error('Template invalido: word/document.xml ausente');

  let xml = doc.dados.toString('utf8');
  let xmlRels = rels.dados.toString('utf8');

  if (!xml.includes(PLACEHOLDER_CORPO)) {
    throw new Error(`Template sem o marcador "${PLACEHOLDER_CORPO}" — o gerador nao sabe onde inserir o conteudo.`);
  }

  // 1) titulo da capa
  xml = xml.replace(PLACEHOLDER_TITULO, esc(titulo || PLACEHOLDER_TITULO));

  // 2) corpo: troca o paragrafo do marcador pelo titulo da atividade + conteudo
  const proximoRid = 900;
  const { xml: corpo, imagens } = markdownParaWml(markdown || '', { baseImagens, proximoRid });

  const iMarcador = xml.indexOf(PLACEHOLDER_CORPO);
  const iniPar = xml.lastIndexOf('<w:p>', iMarcador);
  const fimPar = xml.indexOf('</w:p>', iMarcador) + '</w:p>'.length;
  const parMarcador = xml.slice(iniPar, fimPar);
  const parTitulo = parMarcador.replace(PLACEHOLDER_CORPO, esc(atividade || 'Atividade'));

  xml = xml.slice(0, iniPar) + parTitulo + corpo + xml.slice(fimPar);

  // 3) imagens novas -> media/ + rels + content types
  const novas = [];
  imagens.forEach((img, k) => {
    const ext = (path.extname(img.arquivo) || '.png').toLowerCase();
    const nomeMedia = `media/relatorio${k + 1}${ext}`;
    novas.push({ nome: `word/${nomeMedia}`, dados: fs.readFileSync(img.arquivo) });
    xmlRels = xmlRels.replace('</Relationships>',
      `<Relationship Id="${img.rid}" Target="${nomeMedia}" ` +
      'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"/></Relationships>');

    const extLimpa = ext.slice(1);
    const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp' }[extLimpa];
    if (tipos && mime) {
      const xmlTipos = tipos.dados.toString('utf8');
      if (!new RegExp(`Extension="${extLimpa}"`, 'i').test(xmlTipos)) {
        tipos.dados = Buffer.from(
          xmlTipos.replace(/(<Types[^>]*>)/, `$1<Default ContentType="${mime}" Extension="${extLimpa}"/>`),
          'utf8'
        );
      }
    }
  });

  doc.dados = Buffer.from(xml, 'utf8');
  rels.dados = Buffer.from(xmlRels, 'utf8');

  fs.mkdirSync(path.dirname(saida), { recursive: true });
  fs.writeFileSync(saida, escreverZip([...entradas, ...novas]));
  return { saida, imagens: imagens.length };
}

module.exports = { gerarDocx, markdownParaWml };
