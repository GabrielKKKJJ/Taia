'use strict';
// Leitor/escritor ZIP minimo, sem dependencias. Usado para abrir e regravar .docx.
const zlib = require('zlib');

const TABELA_CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TABELA_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function lerZip(buf) {
  let eocd = -1;
  const limite = Math.max(0, buf.length - 22 - 65535);
  for (let i = buf.length - 22; i >= limite; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('ZIP invalido: fim do diretorio central nao encontrado');

  const total = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const entradas = [];

  for (let i = 0; i < total; i++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error('ZIP invalido: diretorio central corrompido');
    const metodo = buf.readUInt16LE(off + 10);
    const tamComp = buf.readUInt32LE(off + 20);
    const tamNome = buf.readUInt16LE(off + 28);
    const tamExtra = buf.readUInt16LE(off + 30);
    const tamComentario = buf.readUInt16LE(off + 32);
    const offLocal = buf.readUInt32LE(off + 42);
    const nome = buf.toString('utf8', off + 46, off + 46 + tamNome);

    const tamNomeLocal = buf.readUInt16LE(offLocal + 26);
    const tamExtraLocal = buf.readUInt16LE(offLocal + 28);
    const inicio = offLocal + 30 + tamNomeLocal + tamExtraLocal;
    const bruto = buf.subarray(inicio, inicio + tamComp);

    entradas.push({
      nome,
      dados: metodo === 0 ? Buffer.from(bruto) : zlib.inflateRawSync(bruto),
    });
    off += 46 + tamNome + tamExtra + tamComentario;
  }
  return entradas;
}

function escreverZip(entradas) {
  const locais = [];
  const centrais = [];
  let offset = 0;

  for (const e of entradas) {
    const nome = Buffer.from(e.nome, 'utf8');
    const dados = Buffer.isBuffer(e.dados) ? e.dados : Buffer.from(e.dados, 'utf8');
    const comp = zlib.deflateRawSync(dados, { level: 9 });
    const crc = crc32(dados);

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0x0800, 6); // nomes em UTF-8
    lh.writeUInt16LE(8, 8);      // deflate
    lh.writeUInt16LE(0, 10);
    lh.writeUInt16LE(0x21, 12);  // 1980-01-01, mantem saida deterministica
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(comp.length, 18);
    lh.writeUInt32LE(dados.length, 22);
    lh.writeUInt16LE(nome.length, 26);
    lh.writeUInt16LE(0, 28);
    locais.push(lh, nome, comp);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt16LE(8, 10);
    ch.writeUInt16LE(0, 12);
    ch.writeUInt16LE(0x21, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(comp.length, 20);
    ch.writeUInt32LE(dados.length, 24);
    ch.writeUInt16LE(nome.length, 28);
    ch.writeUInt32LE(offset, 42);
    centrais.push(ch, nome);

    offset += 30 + nome.length + comp.length;
  }

  const cd = Buffer.concat(centrais);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entradas.length, 8);
  eocd.writeUInt16LE(entradas.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);

  return Buffer.concat([...locais, cd, eocd]);
}

module.exports = { lerZip, escreverZip, crc32 };
