'use strict';
// Lista os cursos ativos e sugere o bloco "apelidos" do config.json.
const path = require('path');
const fs = require('fs');
const { Canvas } = require('./lib/canvas');
const { carregarEnv } = require('./lib/util');

const RAIZ = path.resolve(__dirname, '..');
carregarEnv(RAIZ);
const cfg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'config.json'), 'utf8'));

function apelidoSugerido(curso) {
  let nome = curso.name || curso.course_code || '';

  // "[Oficial - PT] - Internet das Coisas - CSIO-353" -> "Internet das Coisas"
  nome = nome.replace(/^\s*\[[^\]]*\]\s*[-–]\s*/, '');            // marcador de idioma/status
  nome = nome.replace(/\s*[-–]\s*[A-Z]{2,}-?\d[\w.\-]*\s*$/, ''); // codigo da disciplina
  nome = nome.replace(/\s*[-–]\s*(G\d|Grupo \d)\s*[-–]\s*Cohorte\s*\d\s*$/i, '');
  nome = nome.replace(/\s*[-–]\s*(20\d\d|T[1-4]|M\d+\.T\d+\.\d+|Turma.*)$/i, '');
  nome = nome.replace(/\s+/g, ' ').trim();

  const siglas = {
    'internet das coisas': 'IoT',
    'internet of things': 'IoT',
    'competências essenciais': 'Competências Essenciais',
    'competencias essenciais': 'Competências Essenciais',
  };
  const chave = nome.toLowerCase();
  for (const [k, v] of Object.entries(siglas)) if (chave.includes(k)) return v;

  return nome.slice(0, 32).trim();
}

(async () => {
  const canvas = new Canvas({
    baseUrl: cfg.baseUrl,
    token: process.env.CANVAS_TOKEN,
    cookie: process.env.CANVAS_COOKIE,
  });

  const eu = await canvas.eu();
  console.log(`Conectado como: ${eu.name} (id ${eu.id})\n`);

  const cursos = await canvas.cursos();
  if (!cursos || !cursos.length) {
    console.log('Nenhum curso ativo encontrado.');
    return;
  }

  const apelidos = {};
  console.log('Cursos ativos:');
  for (const c of cursos) {
    apelidos[String(c.id)] = apelidoSugerido(c);
    console.log(`  ${String(c.id).padEnd(6)} ${c.course_code || '-'}  ${c.name}`);
  }

  console.log('\nCole este bloco em config.json -> cursos.apelidos (ajuste os nomes das pastas):');
  console.log(JSON.stringify(apelidos, null, 2));
})().catch((e) => {
  console.error('\nErro:', e.message);
  process.exit(1);
});
