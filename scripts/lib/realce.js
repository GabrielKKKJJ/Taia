'use strict';
// Realce de sintaxe para os blocos de codigo do .docx.
// Devolve tokens coloridos; quem monta o XML e o docx.js.

// Paleta clara, legivel tambem impressa em preto e branco (os tons tem
// luminancia bem diferente entre si).
const COR = {
  padrao: '1F2328',
  chave: '0F52BA',   // azul
  tipo: '1D6D75',    // teal
  texto: 'A31515',   // vermelho escuro - strings
  numero: '0A7A3D',  // verde escuro
  comentario: '6E7781',
  simbolo: '5A5A5A',
};

const PALAVRAS = {
  csharp: `abstract as async await base bool break byte case catch char class const continue decimal
    default delegate do double else enum event explicit extern false finally fixed float for foreach
    get if implicit in int interface internal is lock long namespace new null object operator out
    override params private protected public readonly record ref return sealed set short sizeof
    stackalloc static string struct switch this throw true try typeof uint ulong ushort using var
    virtual void volatile where while yield`,
  typescript: `abstract any as async await boolean break case catch class const constructor continue
    declare default delete do else enum export extends false finally for from function get if
    implements import in instanceof interface let new null number of private protected public
    readonly return set static string super switch this throw true try type typeof undefined var
    void while yield`,
  javascript: `async await break case catch class const continue default delete do else export extends
    false finally for from function if import in instanceof let new null return static super switch
    this throw true try typeof undefined var void while yield`,
  python: `and as assert async await break class continue def del elif else except False finally for
    from global if import in is lambda None nonlocal not or pass raise return True try while with yield`,
  cpp: `auto bool break byte case catch char class const constexpr continue default delete do double
    else enum explicit extern false float for friend goto if inline int long namespace new nullptr
    operator private protected public return short signed sizeof static struct switch template this
    throw true try typedef typename union unsigned using virtual void volatile while`,
  sql: `ADD ALTER ANALYZE AND AS ASC BY CREATE DEFAULT DELETE DESC DROP EXISTS EXPLAIN FOR FROM FULL
    GROUP HAVING IN INDEX INNER INSERT INTO IS JOIN KEY LEFT LIMIT NOT NULL OFFSET ON OR ORDER OUTER
    PARTITION PRIMARY RANGE RETURNS RIGHT SELECT SET TABLE UNION UNIQUE UPDATE VALUES WHERE WITH`,
  yaml: '',
  json: '',
  bash: `case cd do done echo elif else esac exit export fi for function if in local return then until while`,
};

const APELIDOS = {
  cs: 'csharp', 'c#': 'csharp',
  ts: 'typescript', tsx: 'typescript',
  js: 'javascript', node: 'javascript',
  py: 'python',
  c: 'cpp', 'c++': 'cpp', ino: 'cpp', arduino: 'cpp',
  yml: 'yaml',
  sh: 'bash', shell: 'bash', console: 'bash',
  postgres: 'sql', psql: 'sql',
};

function normalizar(idioma) {
  const k = String(idioma || '').toLowerCase().trim();
  return APELIDOS[k] || (k in PALAVRAS ? k : null);
}

function conjunto(idioma) {
  return new Set((PALAVRAS[idioma] || '').split(/\s+/).filter(Boolean));
}

/** Linguagens em que `#` inicia comentario de linha. */
const CERQUILHA = new Set(['python', 'yaml', 'bash']);

/**
 * Tokeniza um bloco inteiro, preservando estado entre linhas (comentario de
 * bloco e o unico caso que atravessa quebra de linha).
 *
 * @returns {Array<Array<{texto: string, cor: string, italico?: boolean}>>}
 *          uma lista de tokens por linha
 */
function realcar(codigo, idioma) {
  const lang = normalizar(idioma);
  const linhas = String(codigo).replace(/\r\n/g, '\n').split('\n');

  // Sem linguagem reconhecida, devolve tudo na cor padrao.
  if (!lang) return linhas.map((l) => [{ texto: l, cor: COR.padrao }]);

  const chaves = conjunto(lang);
  const chavesMinusculas = lang === 'sql';
  const saida = [];
  let emBloco = false;

  for (const linha of linhas) {
    const tokens = [];
    let buf = '';
    let i = 0;

    const despejar = () => {
      if (!buf) return;
      const comparavel = chavesMinusculas ? buf.toUpperCase() : buf;
      if (chaves.has(comparavel)) tokens.push({ texto: buf, cor: COR.chave });
      else if (/^\d/.test(buf)) tokens.push({ texto: buf, cor: COR.numero });
      // Identificador iniciando em maiuscula: tipo, classe ou constante.
      else if (/^[A-Z][A-Za-z0-9_]*$/.test(buf)) tokens.push({ texto: buf, cor: COR.tipo });
      else tokens.push({ texto: buf, cor: COR.padrao });
      buf = '';
    };

    while (i < linha.length) {
      const c = linha[i];
      const prox = linha[i + 1];

      if (emBloco) {
        const fim = linha.indexOf('*/', i);
        if (fim === -1) {
          tokens.push({ texto: linha.slice(i), cor: COR.comentario, italico: true });
          i = linha.length;
        } else {
          tokens.push({ texto: linha.slice(i, fim + 2), cor: COR.comentario, italico: true });
          i = fim + 2;
          emBloco = false;
        }
        continue;
      }

      // comentarios
      const linhaComentada =
        (c === '/' && prox === '/') ||
        (c === '#' && CERQUILHA.has(lang)) ||
        (c === '-' && prox === '-' && lang === 'sql');

      if (linhaComentada) {
        despejar();
        tokens.push({ texto: linha.slice(i), cor: COR.comentario, italico: true });
        break;
      }

      if (c === '/' && prox === '*') {
        despejar();
        emBloco = true;
        continue;
      }

      // strings
      if (c === '"' || c === "'" || c === '`') {
        despejar();
        const aspas = c;
        let j = i + 1;
        while (j < linha.length && linha[j] !== aspas) {
          if (linha[j] === '\\') j++;
          j++;
        }
        tokens.push({ texto: linha.slice(i, Math.min(j + 1, linha.length)), cor: COR.texto });
        i = j + 1;
        continue;
      }

      if (/[A-Za-z0-9_$]/.test(c)) { buf += c; i++; continue; }

      despejar();
      tokens.push({ texto: c, cor: /[{}()[\];,.]/.test(c) ? COR.simbolo : COR.padrao });
      i++;
    }
    despejar();

    saida.push(tokens.length ? tokens : [{ texto: '', cor: COR.padrao }]);
  }

  return saida;
}

module.exports = { realcar, COR };
