# Pendencias — 6.4 Tarefas (Programação 6)

_Fora do documento entregue, conforme combinado. Verificado contra `origin/LB-6` em 23/08/2026._

## 1. Endpoint HTTP disparador de notificação — NÃO EXISTE

A lógica de pontuação do enunciado cobra explicitamente: *"Foi incluído um endpoint HTTP
para disparar notificações"*. Nenhum arquivo em `backend/Endpoints/` referencia
`IHubContext` — as rotas cobrem só autenticação e salas.

A capacidade já está montada: `GameRoomManager` injeta `IHubContext<GameHub, IGameClient>`.
Falta expor a rota. Um `MapPost` em `/api/rooms/{roomId}/notify` que chame
`hub.Clients.Group(roomId)` fecha o item.

## 2. Histórico de notificações na UI — NÃO EXISTE

O enunciado pede *"Mostrar o histórico de notificações durante a sessão"*. Os dados existem
(`RedisStateService.GetRecentEventsAsync` devolve os últimos 100 eventos), mas nenhum
componente Angular os exibe. O documento declara isso honestamente na seção 5.

## 3. Sair da sala não funciona — BUG ABERTO

`game.service.ts:81` faz `send('leaveRoom', this.currentRoomId)`, enviando uma **string**,
enquanto `GameHub.LeaveRoom` espera um `JoinPayload`. `RoomId` e `PlayerId` chegam nulos, e
o jogador não é removido do grupo nem da sala.

Correção: enviar `{ roomId, playerId }`.

## 4. `OnDisconnectedAsync` ausente — BUG ABERTO

Não existe no backend (confirmado: zero ocorrências). Uma queda de conexão não remove o
jogador da sala. Somado ao item 3, **nenhum caminho** de saída funciona hoje.

## 5. Capturas do fluxo funcionando

O enunciado pede capturas no README. Faltam: painel do broker com o cliente conectado,
navegador recebendo evento, e duas abas recebendo o mesmo evento.

---

## Já resolvido pelo grupo

Os dois defeitos de compilação apontados na semana passada foram corrigidos no commit
`cc4b845` (*fix(backend): resolve namespace collision and mqtt dependency mismatch*):
o `namespace` duplicado em `GameRoomManager.cs` e a incompatibilidade entre `MQTTnet 5.2.0`
e `MQTTnet.Extensions.ManagedClient 4.3.7`. O backend compila.
