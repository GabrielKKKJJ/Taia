# Pendencias — 6.4 Tarefas

_Retiradas automaticamente do relatorio: nao aparecem no .docx entregue._

## 1.

**[BLOQUEANTE] `backend/Services/GameRoomManager.cs` declara o namespace duas vezes** —
`namespace backend.Services;` aparece na linha 1 (forma *file-scoped*) e outra vez na
linha 8. C# não aceita as duas formas no mesmo arquivo; o projeto não compila. Correção:
remover a declaração da linha 8 e manter os `using` acima dela.
**[BLOQUEANTE] Versões incompatíveis de MQTTnet no `backend.csproj`** —
`MQTTnet 5.2.0.1603` convive com `MQTTnet.Extensions.ManagedClient 4.3.7.1207`. A linha 5
do MQTTnet reorganizou a API, e `MqttGameService.cs` usa a forma 4.x (`using
MQTTnet.Client`, `new MqttFactory()`, `CreateManagedMqttClient`). Correção mais simples:
fixar `MQTTnet` em `4.3.7.1207`, igualando ao pacote do ManagedClient.
**[IMPORTANTE] Sair da sala não funciona** — `game.service.ts` faz
`this.activeTransport.send('leaveRoom', this.currentRoomId)`, enviando uma *string*,
enquanto `GameHub.LeaveRoom` espera um `JoinPayload`. O `RoomId` e o `PlayerId` chegam
nulos, então o jogador não é removido do grupo nem da sala. Correção: enviar
`{ roomId, playerId }`. Vale notar que também não há `OnDisconnectedAsync` no hub, então
uma queda de conexão não limpa o jogador — só a saída explícita, hoje quebrada, tentaria.

## 2.

[PENDENTE: expor um endpoint HTTP que dispare notificação via `IHubContext` — item
explícito da lógica de pontuação (ver seção 4).]
[PENDENTE: exibir na UI o histórico de notificações da sessão, consumindo
`GetRecentEventsAsync` (ver seção 5).]
[PENDENTE: capturas do fluxo funcionando — `docker compose up` com Redis e Mosquitto no
ar, o log do backend com "Connected to MQTT Broker.", o console do navegador com
"[MqttTransportService] Conectado ao MQTT Broker via WebSocket", e duas abas recebendo o
mesmo evento de dano.]
[PENDENTE: resultados do benchmark. O script `scripts/benchmarks/benchmark.js` está
pronto e mede RTT médio, mínimo, máximo e vazão sobre 1000 mensagens, mas **nenhum
resultado foi registrado no repositório**. Rodar com o broker no ar
(`node scripts/benchmarks/benchmark.js`) e colar a saída aqui.]
