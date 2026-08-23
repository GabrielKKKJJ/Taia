'use strict';
// Renderiza blocos de codigo como imagem, no estilo do Carbon: janela com
// barra de titulo, cantos arredondados e sombra. Usa o mesmo Chrome do mermaid.
const fs = require('fs');
const path = require('path');
const { realcar, COR } = require('./realce');
const { acharNavegador } = require('./mermaid');

const TEMAS = {
  claro: {
    fundoPagina: 'transparent',
    janela: '#ffffff',
    barra: '#f1f3f5',
    borda: '#dfe3e8',
    texto: COR.padrao,
    rotulo: '#8b949e',
    numeros: '#c2c8d0',
    sombra: '0 10px 30px rgba(16,22,26,.13), 0 2px 6px rgba(16,22,26,.08)',
  },
  escuro: {
    fundoPagina: 'transparent',
    janela: '#1e222a',
    barra: '#272b33',
    borda: '#2f343d',
    texto: '#d5d9e0',
    rotulo: '#6b7280',
    numeros: '#454b56',
    sombra: '0 12px 32px rgba(0,0,0,.35)',
    // No escuro a paleta do realce precisa clarear para manter contraste.
    cores: {
      [COR.chave]: '#7aa2f7',
      [COR.tipo]: '#56b6c2',
      [COR.texto]: '#e5a98b',
      [COR.numero]: '#a3d27f',
      [COR.comentario]: '#6b7280',
      [COR.simbolo]: '#9aa2ad',
      [COR.padrao]: '#d5d9e0',
    },
  },
};

const escHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function paginaHtml(codigo, idioma, tema, { numerarLinhas, maxColunas }) {
  const t = TEMAS[tema] || TEMAS.claro;
  const linhas = realcar(codigo, idioma);

  // Largura da janela pela linha mais longa, com teto — linha muito longa
  // encolheria a fonte no documento a ponto de ficar ilegivel.
  const maisLonga = Math.max(...codigo.split('\n').map((l) => l.length), 20);
  const colunas = Math.min(maisLonga, maxColunas);

  const corpo = linhas.map((tokens, i) => {
    const spans = tokens.map((tk) => {
      const cor = (t.cores && t.cores[tk.cor]) || `#${tk.cor}`;
      const estilo = `color:${cor}${tk.italico ? ';font-style:italic' : ''}`;
      return `<span style="${estilo}">${escHtml(tk.texto)}</span>`;
    }).join('');
    const num = numerarLinhas
      ? `<span class="ln">${String(i + 1).padStart(2, ' ')}</span>`
      : '';
    return `<div class="linha">${num}<span class="cod">${spans || '&nbsp;'}</span></div>`;
  }).join('');

  return `<!doctype html><html><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 26px;
    background: ${t.fundoPagina};
    font-family: "Cascadia Mono", Consolas, "DejaVu Sans Mono", monospace;
  }
  .janela {
    display: inline-block;
    background: ${t.janela};
    border: 1px solid ${t.borda};
    border-radius: 10px;
    box-shadow: ${t.sombra};
    overflow: hidden;
    min-width: 260px;
  }
  .barra {
    display: flex; align-items: center; gap: 7px;
    padding: 9px 13px;
    background: ${t.barra};
    border-bottom: 1px solid ${t.borda};
  }
  .ponto { width: 11px; height: 11px; border-radius: 50%; }
  .rotulo {
    margin-left: auto; font-size: 11.5px; letter-spacing: .3px;
    color: ${t.rotulo};
  }
  .corpo { padding: 14px 16px 16px; }
  .linha { display: flex; font-size: 13px; line-height: 1.55; white-space: pre; }
  .ln {
    color: ${t.numeros}; user-select: none;
    padding-right: 14px; text-align: right; min-width: 26px;
  }
  .cod { flex: 1; }
</style></head><body>
<div class="janela" style="width: ${colunas * 7.8 + (numerarLinhas ? 40 : 0) + 34}px">
  <div class="barra">
    <span class="ponto" style="background:#ff5f57"></span>
    <span class="ponto" style="background:#febc2e"></span>
    <span class="ponto" style="background:#28c840"></span>
    ${idioma ? `<span class="rotulo">${escHtml(idioma)}</span>` : ''}
  </div>
  <div class="corpo">${corpo}</div>
</div>
</body></html>`;
}

/**
 * Renderiza varios blocos numa unica sessao do navegador.
 * @param {Array<{codigo: string, idioma: string, saida: string}>} itens
 * @param {object} [opcoes]
 * @returns {Promise<Array<{saida: string, ok: boolean, erro?: string}>>}
 */
async function renderizarBlocos(itens, opcoes = {}) {
  if (!itens.length) return [];

  const {
    tema = 'claro',
    numerarLinhas = true,
    maxColunas = 96,
    maxLinhas = 60,
  } = opcoes;

  const executavel = acharNavegador();
  if (!executavel) {
    return itens.map((i) => ({ saida: i.saida, ok: false, erro: 'Chrome/Edge nao encontrado' }));
  }

  let puppeteer;
  try {
    puppeteer = require('puppeteer-core');
  } catch (e) {
    return itens.map((i) => ({ saida: i.saida, ok: false, erro: `puppeteer-core ausente: ${e.message}` }));
  }

  const navegador = await puppeteer.launch({
    executablePath: executavel,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=2'],
  });

  const resultados = [];
  try {
    const pagina = await navegador.newPage();
    await pagina.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 });

    for (const item of itens) {
      try {
        // Bloco muito longo vira imagem alta demais para caber na pagina;
        // nesses casos o texto no .docx e mais util que a estetica.
        if (item.codigo.split('\n').length > maxLinhas) {
          resultados.push({ saida: item.saida, ok: false, erro: `bloco com mais de ${maxLinhas} linhas` });
          continue;
        }

        await pagina.setContent(
          paginaHtml(item.codigo, item.idioma, tema, { numerarLinhas, maxColunas }),
          { waitUntil: 'domcontentloaded' }
        );

        fs.mkdirSync(path.dirname(item.saida), { recursive: true });
        const alvo = await pagina.$('.janela');
        // omitBackground preserva a sombra sobre fundo transparente.
        await alvo.screenshot({ path: item.saida, omitBackground: true });
        resultados.push({ saida: item.saida, ok: true });
      } catch (e) {
        resultados.push({ saida: item.saida, ok: false, erro: String(e.message || e) });
      }
    }
  } finally {
    await navegador.close();
  }

  return resultados;
}

module.exports = { renderizarBlocos };
