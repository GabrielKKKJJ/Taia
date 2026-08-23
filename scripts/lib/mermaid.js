'use strict';
// Renderiza blocos ```mermaid em PNG, usando o Chrome ja instalado na maquina.
// Nao baixa Chromium: usa puppeteer-core apontando para o navegador do sistema.
const fs = require('fs');
const path = require('path');

const CAMINHOS_CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/microsoft-edge',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];

function acharNavegador() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  return CAMINHOS_CHROME.find((p) => fs.existsSync(p)) || null;
}

/** Fundo branco e fontes do documento, para o PNG combinar com o .docx. */
function paginaHtml(js) {
  return `<!doctype html><html><head><meta charset="utf-8">
<style>
  body { margin: 0; padding: 16px; background: #ffffff;
         font-family: "Open Sans", Arial, sans-serif; }
  #alvo { display: inline-block; }
  #alvo svg { max-width: none; height: auto; }
</style>
<script>${js}</script>
</head><body><div id="alvo"></div></body></html>`;
}

/**
 * Renderiza varios diagramas mermaid numa unica sessao do navegador.
 * @param {Array<{codigo: string, saida: string}>} itens
 * @returns {Promise<Array<{saida: string, ok: boolean, erro?: string}>>}
 */
async function renderizarDiagramas(itens) {
  if (!itens.length) return [];

  const executavel = acharNavegador();
  if (!executavel) {
    return itens.map((i) => ({ saida: i.saida, ok: false, erro: 'Chrome/Edge nao encontrado' }));
  }

  let puppeteer;
  let mermaidJs;
  try {
    // puppeteer-core 22+ e ESM-only: precisa de import() dinamico, require() nao funciona.
    ({ default: puppeteer } = await import('puppeteer-core'));
    mermaidJs = fs.readFileSync(require.resolve('mermaid/dist/mermaid.min.js'), 'utf8');
  } catch (e) {
    return itens.map((i) => ({ saida: i.saida, ok: false, erro: `dependencia ausente: ${e.message}` }));
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
    await pagina.setContent(paginaHtml(mermaidJs), { waitUntil: 'domcontentloaded' });

    await pagina.evaluate(() => {
      window.mermaid.initialize({
        startOnLoad: false,
        theme: 'neutral',
        fontFamily: 'Open Sans, Arial, sans-serif',
        flowchart: { curve: 'basis', useMaxWidth: false },
        sequence: { useMaxWidth: false },
      });
    });

    for (let i = 0; i < itens.length; i++) {
      const item = itens[i];
      try {
        const erro = await pagina.evaluate(async (codigo, id) => {
          const alvo = document.getElementById('alvo');
          alvo.innerHTML = '';
          try {
            const { svg } = await window.mermaid.render(id, codigo);
            alvo.innerHTML = svg;
            return null;
          } catch (e) {
            return String((e && e.message) || e);
          }
        }, item.codigo, `diag${i}`);

        if (erro) {
          resultados.push({ saida: item.saida, ok: false, erro });
          continue;
        }

        fs.mkdirSync(path.dirname(item.saida), { recursive: true });
        const elemento = await pagina.$('#alvo');
        await elemento.screenshot({ path: item.saida, omitBackground: false });
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

module.exports = { renderizarDiagramas, acharNavegador };
