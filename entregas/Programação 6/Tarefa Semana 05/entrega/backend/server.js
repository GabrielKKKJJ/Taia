'use strict';
/**
 * Servidor de notificacoes em tempo real.
 *
 * Duas portas de entrada para o mesmo fluxo de saida:
 *  - POST /notify  -> qualquer sistema dispara uma notificacao por HTTP;
 *  - Socket.IO     -> todos os clientes conectados recebem, sem pedir.
 *
 * O REST e o caminho de escrita e o WebSocket e o de leitura. Quem dispara nao
 * precisa manter conexao aberta; quem escuta nao precisa ficar perguntando.
 */
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const PORTA = Number(process.env.PORT) || 3000;
const ORIGEM_FRONTEND = process.env.CORS_ORIGIN || 'http://localhost:4200';

const app = express();
const servidor = http.createServer(app);

const io = new Server(servidor, {
  cors: { origin: ORIGEM_FRONTEND, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: ORIGEM_FRONTEND }));
app.use(express.json());

// Historico da sessao do servidor. Um sistema real usaria Redis ou banco;
// aqui a janela em memoria basta e deixa explicito que e estado efemero.
const MAX_HISTORICO = 100;
const historico = [];
let sequencia = 0;

/** Conexoes vivas, para o painel de status e para os avisos de entrada/saida. */
const conectados = new Map();

function registrar(notificacao) {
  historico.unshift(notificacao);
  if (historico.length > MAX_HISTORICO) historico.length = MAX_HISTORICO;
  return notificacao;
}

function criarNotificacao({ titulo, mensagem, nivel = 'info', origem = 'api' }) {
  return {
    id: ++sequencia,
    titulo,
    mensagem,
    nivel,
    origem,
    enviadoEm: new Date().toISOString(),
  };
}

// --- REST ---------------------------------------------------------------

/** Dispara uma notificacao para todos os clientes conectados. */
app.post('/notify', (req, res) => {
  const { titulo, mensagem, nivel } = req.body || {};

  if (!mensagem || typeof mensagem !== 'string' || !mensagem.trim()) {
    return res.status(400).json({ erro: "O campo 'mensagem' e obrigatorio." });
  }

  const niveisValidos = ['info', 'sucesso', 'alerta', 'erro'];
  if (nivel && !niveisValidos.includes(nivel)) {
    return res.status(400).json({ erro: `nivel deve ser um de: ${niveisValidos.join(', ')}` });
  }

  const notificacao = registrar(criarNotificacao({
    titulo: (titulo || 'Notificacao').trim(),
    mensagem: mensagem.trim(),
    nivel: nivel || 'info',
  }));

  // Emite para todos os clientes conectados, inclusive quem disparou.
  io.emit('notificacao', notificacao);

  console.log(`[REST] notificacao #${notificacao.id} -> ${io.engine.clientsCount} cliente(s)`);
  return res.status(202).json({ entregue: true, clientes: io.engine.clientsCount, notificacao });
});

/** Historico da sessao, para quem chega depois de eventos ja emitidos. */
app.get('/notifications', (_req, res) => {
  res.json({ total: historico.length, itens: historico });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', clientes: io.engine.clientsCount, historico: historico.length });
});

// --- WebSocket ----------------------------------------------------------

io.on('connection', (socket) => {
  const cliente = {
    id: socket.id,
    conectadoEm: new Date().toISOString(),
  };
  conectados.set(socket.id, cliente);
  console.log(`[WS] conectou ${socket.id} (${conectados.size} online)`);

  // Quem entra recebe o historico de uma vez, em vez de comecar com a tela
  // vazia enquanto os outros ja viram tudo.
  socket.emit('historico', historico);

  // Os demais sao avisados de que alguem entrou.
  socket.broadcast.emit('presenca', { tipo: 'entrada', clienteId: socket.id, online: conectados.size });
  io.emit('online', conectados.size);

  socket.on('disconnect', (motivo) => {
    conectados.delete(socket.id);
    console.log(`[WS] desconectou ${socket.id} (${motivo}) — ${conectados.size} online`);
    socket.broadcast.emit('presenca', { tipo: 'saida', clienteId: socket.id, online: conectados.size });
    io.emit('online', conectados.size);
  });

  // Permite disparar tambem pelo proprio socket, sem passar pelo REST.
  socket.on('publicar', (dados, confirmar) => {
    if (!dados || !dados.mensagem) {
      if (typeof confirmar === 'function') confirmar({ erro: 'mensagem obrigatoria' });
      return;
    }
    const notificacao = registrar(criarNotificacao({
      titulo: dados.titulo || 'Do cliente',
      mensagem: String(dados.mensagem),
      nivel: dados.nivel || 'info',
      origem: `socket:${socket.id.slice(0, 6)}`,
    }));
    io.emit('notificacao', notificacao);
    if (typeof confirmar === 'function') confirmar({ ok: true, id: notificacao.id });
  });
});

servidor.listen(PORTA, () => {
  console.log(`Servidor de notificacoes em http://localhost:${PORTA}`);
  console.log(`Socket.IO aceitando origem ${ORIGEM_FRONTEND}`);
  console.log(`Dispare com: curl -X POST http://localhost:${PORTA}/notify -H "Content-Type: application/json" -d "{\\"mensagem\\":\\"ola\\"}"`);
});

module.exports = { app, servidor, io };
