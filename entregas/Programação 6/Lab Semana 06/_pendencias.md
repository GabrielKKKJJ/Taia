# Pendencias — A.6 Laboratório Semana 6

_Retiradas automaticamente do relatorio: nao aparecem no .docx entregue._

## 1.

[PENDENTE: rodar a contraparte SignalR (`@microsoft/signalr` já está no
`package.json` dos benchmarks) para ter a comparação lado a lado, e gerar o gráfico de
latência que o enunciado pede.]

## 2.

[PENDENTE: registrar a verificação ponta a ponta — subir a infraestrutura, entrar numa
sala com dois clientes, destruir paredes e causar dano, desconectar um cliente e
reconectá-lo, confirmando que o cenário volta com as paredes destruídas. Conferir as
chaves no Redis com `docker exec -it scripts-redis-1 redis-cli` e `LRANGE <chave> 0 -1`.]

## 3.

**[BLOQUEANTE] `backend/Services/GameRoomManager.cs` declara o namespace duas vezes** —
`namespace backend.Services;` na linha 1 (forma *file-scoped*) e de novo na linha 8. C#
não aceita as duas formas no mesmo arquivo. Correção: apagar a declaração da linha 8.
**[BLOQUEANTE] Versões incompatíveis de MQTTnet no `backend.csproj`** —
`MQTTnet 5.2.0.1603` ao lado de `MQTTnet.Extensions.ManagedClient 4.3.7.1207`. O MQTTnet 5
reorganizou a API, e `MqttGameService.cs` usa a forma 4.x (`using MQTTnet.Client`,
`new MqttFactory()`, `CreateManagedMqttClient`). Correção mais simples: fixar `MQTTnet`
em `4.3.7.1207`.
**[IMPORTANTE] Sair da sala não funciona** — `game.service.ts` envia uma string em
`send('leaveRoom', this.currentRoomId)`, mas `GameHub.LeaveRoom` espera um `JoinPayload`.
Some-se a isso a ausência de `OnDisconnectedAsync` no hub: nem a saída explícita nem a
queda de conexão removem o jogador da sala.

## 4.

[PENDENTE: `docker compose up -d` com Redis e Mosquitto no ar]
[PENDENTE: log do backend exibindo "Connected to MQTT Broker."]
[PENDENTE: console do navegador com "[MqttTransportService] Conectado ao MQTT Broker via WebSocket"]
[PENDENTE: duas abas na mesma sala, uma causando dano e a outra recebendo o evento]
[PENDENTE: saída do `benchmark.js` com RTT médio, mínimo, máximo e vazão]
