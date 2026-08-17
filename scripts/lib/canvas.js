'use strict';
// Cliente minimo da API REST do Canvas (lms.jala.university).
const fs = require('fs');
const path = require('path');

class Canvas {
  /**
   * @param {object} cfg
   * @param {string} cfg.baseUrl  ex.: https://lms.jala.university
   * @param {string} [cfg.token]  Token de acesso pessoal (Conta > Configuracoes)
   * @param {string} [cfg.cookie] Alternativa: cookie de sessao do navegador
   */
  constructor({ baseUrl, token, cookie }) {
    if (!baseUrl) throw new Error('baseUrl nao configurada');
    if (!token && !cookie) {
      throw new Error(
        'Sem credencial: defina CANVAS_TOKEN (ou CANVAS_COOKIE) no arquivo .env.\n' +
        'Veja o README, secao "Passo 1 - token de acesso".'
      );
    }
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
    this.cookie = cookie;
  }

  get cabecalhos() {
    const h = { Accept: 'application/json+canvas-string-ids, application/json' };
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    if (this.cookie) h.Cookie = this.cookie;
    return h;
  }

  /** GET numa rota da API, seguindo paginacao pelo header Link. */
  async api(rota, params = {}) {
    let url = new URL(rota.startsWith('http') ? rota : `${this.baseUrl}/api/v1${rota}`);
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) v.forEach((x) => url.searchParams.append(k, x));
      else url.searchParams.set(k, v);
    }
    if (!url.searchParams.has('per_page')) url.searchParams.set('per_page', '100');

    let acumulado = null;
    for (let pagina = 0; pagina < 25 && url; pagina++) {
      const resp = await fetch(url, { headers: this.cabecalhos, redirect: 'follow' });
      if (resp.status === 401 || resp.status === 403) {
        throw new Error(
          `Canvas recusou a credencial (HTTP ${resp.status}) em ${url.pathname}. ` +
          'O token pode estar expirado ou sem permissao.'
        );
      }
      if (resp.status === 404) return null;
      if (!resp.ok) throw new Error(`Canvas HTTP ${resp.status} em ${url.pathname}: ${(await resp.text()).slice(0, 300)}`);

      const dados = await resp.json();
      if (Array.isArray(dados)) acumulado = acumulado ? acumulado.concat(dados) : dados;
      else return dados;

      const link = resp.headers.get('link') || '';
      const prox = link.split(',').map((s) => s.match(/<([^>]+)>;\s*rel="next"/)).find(Boolean);
      url = prox ? new URL(prox[1]) : null;
    }
    return acumulado;
  }

  eu() {
    return this.api('/users/self');
  }

  cursos() {
    return this.api('/courses', {
      enrollment_state: 'active',
      'include[]': ['term', 'course_image'],
      state: ['available'],
    });
  }

  /** Tarefas do curso, com a submissao do proprio aluno anexada. */
  tarefas(cursoId) {
    return this.api(`/courses/${cursoId}/assignments`, {
      'include[]': ['submission', 'all_dates'],
      order_by: 'due_at',
    });
  }

  modulos(cursoId) {
    return this.api(`/courses/${cursoId}/modules`, { 'include[]': ['items'] });
  }

  paginas(cursoId, termo) {
    return this.api(`/courses/${cursoId}/pages`, { search_term: termo, sort: 'title' });
  }

  pagina(cursoId, urlPagina) {
    return this.api(`/courses/${cursoId}/pages/${encodeURIComponent(urlPagina)}`);
  }

  arquivo(arquivoId) {
    return this.api(`/files/${arquivoId}`);
  }

  /** Baixa um arquivo do Canvas para o disco. Devolve o caminho ou null. */
  async baixar(url, destinoPasta, nomeSugerido) {
    const resp = await fetch(url, { headers: this.cabecalhos, redirect: 'follow' });
    if (!resp.ok) return null;

    let nome = nomeSugerido;
    const cd = resp.headers.get('content-disposition') || '';
    const m = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    if (!nome && m) nome = decodeURIComponent(m[1]);
    if (!nome) nome = path.basename(new URL(url).pathname) || 'arquivo';

    fs.mkdirSync(destinoPasta, { recursive: true });
    const destino = path.join(destinoPasta, nome.replace(/[\\/:*?"<>|]/g, '-'));
    fs.writeFileSync(destino, Buffer.from(await resp.arrayBuffer()));
    return destino;
  }
}

module.exports = { Canvas };
