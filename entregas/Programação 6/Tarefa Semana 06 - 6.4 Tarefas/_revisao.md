# Revisão — 6.4 Tarefas (Programação 6 — Casos de Uso em Tempo Real)

**Veredito:** REPROVADO
**Revisado em:** 2026-08-16 21:15 (rodada 3 — agora contra `origin/LB-6`)

Escopo conferido: `entrega/relatorio.md` + o `.docx` gerado, contra `_contexto/enunciado.md`,
`_contexto/meta.json` e o código real da branch **`origin/LB-6`** do repositório do grupo
(`c:\Users\Djordan\Documents\www\capstone`, lido apenas com `git show` / `git ls-tree` /
`git grep`, sem checkout e sem qualquer alteração). A revisão anterior deste arquivo usava
`LB-5` e foi descartada.

**Leitura do veredito.** A **fidelidade das citações melhorou muito**: os nomes, assinaturas,
tópicos, QoS, portas e comandos citados existem de fato na `LB-6` e conferem quase linha a
linha. **Não há nenhum número fabricado** — as duas pendências de medição estão declaradas.
O que reprova a entrega não é desonestidade do texto, e sim **itens obrigatórios do enunciado
que não estão implementados e não estão declarados como pendência**, mais um **erro de
compilação real** no backend que invalida as instruções de execução da seção 8.

## Cobertura do enunciado

| # | O que foi pedido | Situação | Onde está / o que falta |
|---|---|---|---|
| 1 | Backend: criar uma API que se conecte a um broker MQTT | Atende | `backend/Services/MqttGameService.cs` na `LB-6` — `IHostedService`, `CreateManagedMqttClient`, `WithTcpServer`, `ClientId` com GUID. Citado corretamente no §3 |
| 2 | Analisar em que situações o MQTT seria necessário no capstone | Atende | §6 — três casos (estado persistente, telemetria/integrações, escala horizontal), bem argumentados |
| 3 | Expor endpoints REST necessários, baseados na análise | Parcial | §3.1 lista 4 rotas, todas reais (`AuthEndpoints.cs`, `RoomEndpoints.cs`). Faltam da tabela `PUT /api/rooms/{id}/join` e `GET`/`POST /api/chat` (`Controllers/ChatController.cs`), que existem na branch |
| 4 | Servidor que emita mensagens para todos os clientes conectados | Atende | `GameHub` + `GameRoomManager` usam `Clients.Group`, `Clients.Caller`, `Clients.OthersInGroup` e `IHubContext<GameHub, IGameClient>`; §4 descreve isso com precisão |
| 5 | Servidor que gerencie eventos de conexão/desconexão | **Não atende** | `GameHub` não sobrescreve `OnConnectedAsync`/`OnDisconnectedAsync`; e `game.service.ts:leaveHubRoom()` invoca `LeaveRoom` passando uma **string**, enquanto o hub espera `JoinPayload`. Ver problema 3 |
| 6 | **Endpoint HTTP para disparar notificações** (Lógica de pontuação) | **Não atende** | Não existe rota HTTP que empurre notificação para clientes conectados. `POST /api/chat` só grava numa `List` estática em memória e o frontend faz *polling* a cada 3 s. Ver problema 1 |
| 7 | Frontend: conectar Angular ao servidor com paho-mqtt / ngx-mqtt / WebSocket nativo | Atende | `app.config.ts` com `MqttModule.forRoot({ connectOnCreate: true, url: 'ws://localhost:9001' })` e `MqttTransportService` — citação exata |
| 8 | Frontend: escutar eventos e mostrar atualizações na UI | Atende | `physics.system.ts` assina `onPlayerMove()`, `onPlayerHealth()` e `onWallDamaged()`, que vêm dos `Subject` alimentados pelo MQTT em `game.service.ts` |
| 9 | Frontend: **mostrar o histórico de notificações durante a sessão** | **Não atende** | Não há painel de histórico de notificações. O único histórico da UI é o chat do `waiting-room.component.ts`, alimentado por REST/polling, não pelos eventos em tempo real. O §5 responde ao item com o histórico no **Redis**, que é do backend. Ver problema 4 |
| 10 | Entregável: projeto completo (repositório GitLab) com frontend e backend | Atende | §8 dá a URL correta do grupo 5; a branch `LB-6` tem `backend/`, `frontend/` e `scripts/` |
| 11 | README: estrutura e arquitetura | Parcial | O documento entregue cobre (§2 e §8), mas o `README.md` **da própria branch `LB-6`** não foi atualizado: ainda diz "Backend: .NET 8 WebAPI, C#, WebSockets", sem uma linha sobre MQTT, Mosquitto ou Redis |
| 12 | README: instruções de execução backend/frontend | Atende (no documento) | §8 — `docker compose up -d`, `dotnet run` (5288), `npm start` (4200). Portas conferem com `launchSettings.json` e `docker-compose.yml`. O README do repo só tem os passos antigos, sem a infraestrutura |
| 13 | README: **capturas do fluxo funcionando** | **Não atende** | §10 declara honestamente como `[PENDENTE]`, mas o item continua sem entregar. Nenhuma imagem nova em `docs/assets` na `LB-6` |
| 14 | README: reflexão técnica de 300–400 palavras | Atende | §9 tem **323 palavras** (contagem sobre o corpo da seção). Cobre as duas perguntas: diferenças em relação a WebSockets e escalabilidade/performance |
| 15 | Pontuação: "Angular conecta corretamente" | Parcial | O código está lá, mas depende do backend compilar — ver problema 2 |
| 16 | Pontuação: "O servidor pode emitir eventos e o cliente os recebe" | Parcial | Caminho completo existe (`SendPlayerHealth` → `GameRoomManager.UpdatePlayerHealthAsync` → `PublishEventAsync` → `physics.system.ts`), mas não há evidência de execução |
| 17 | Pontuação: "O projeto funciona de ponta a ponta" | **Não atende** | Erro de compilação no backend — problema 2 |
| 18 | Conteúdo técnico: arquitetura cliente-servidor, justificativa do protocolo, gestão de conexões/eventos | Atende | §2, §4, §6, §7 e §9. A tabela comparativa do §7 é correta e a análise de QoS do §3 está certa |
| 19 | Formato: `online_text_entry` / `online_upload` | Atende | `.docx` gerado em 16/08 21:09, mesmo horário do `relatorio.md` |
| 20 | Prazo | OK | 23/08/2026 23:59. Ainda há uma semana |

## Problemas encontrados

### 1. O endpoint HTTP disparador de notificações não existe, e o texto sugere que existe — [BLOQUEANTE]
- **Onde:** `entrega/relatorio.md:168-170` (§4) e `:117-128` (§3.1); repo `backend/Endpoints/`, `backend/Controllers/ChatController.cs` na `LB-6`
- **Problema:** a Lógica de pontuação do enunciado exige explicitamente "Foi incluído um endpoint HTTP para disparar notificações". Não há nenhuma rota assim na `LB-6`: `AuthEndpoints.cs` e `RoomEndpoints.cs` são CRUD, e `POST /api/chat` apenas adiciona a uma `List<ChatMessageDto>` estática, sem tocar no hub nem no broker. O relatório escreve "qualquer ponto do backend — inclusive um endpoint HTTP — consegue empurrar notificação para os clientes sem depender de uma chamada vinda do hub". A frase é tecnicamente verdadeira sobre `IHubContext`, mas lida na página soa como se o endpoint estivesse implementado. É a única menção ao item, e ele não aparece como pendência.
- **Correção:** implementar a rota (algo como `POST /api/rooms/{id}/notify` injetando `IHubContext<GameHub, IGameClient>` ou `MqttGameService`), documentá-la na tabela do §3.1 e mostrá-la no fluxo; **ou**, se ficar para depois, reescrever a frase do §4 e abrir um `[PENDENTE: endpoint HTTP disparador de notificações não implementado]` no §10.

### 2. `GameRoomManager.cs` não compila — o backend não sobe — [BLOQUEANTE]
- **Onde:** repo, `backend/Services/GameRoomManager.cs` linhas 1 e 8 na `LB-6`; impacto em `entrega/relatorio.md:256-260` (§8, "`dotnet run`")
- **Problema:** o arquivo declara **duas vezes** o namespace com sintaxe *file-scoped*:

  ```csharp
  namespace backend.Services;      // linha 1

  using System.Collections.Concurrent;
  using Microsoft.AspNetCore.SignalR;
  using backend.Hubs;
  using System.Threading;

  namespace backend.Services;      // linha 8
  ```

  C# permite **uma única** declaração *file-scoped* por arquivo e não admite declaração de
  namespace dentro do corpo dela — é erro de compilação (família CS8955/CS8956), não aviso.
  Com isso `dotnet run` falha e nada do que o §8 promete acontece. (Não foi possível rodar o
  compilador aqui: a máquina tem apenas os runtimes .NET 6/10, sem SDK. A conclusão vem da
  regra de linguagem, que não tem exceção.)
- **Correção:** apagar a linha 1 do arquivo no repositório e reconferir que `dotnet build`
  passa antes de entregar. É uma linha.

### 3. Gestão de desconexão não está implementada, e o §4 afirma que está — [BLOQUEANTE]
- **Onde:** `entrega/relatorio.md:130-151` (§4); repo `backend/Hubs/GameHub.cs`, `frontend/src/app/services/game.service.ts:79-84`
- **Problema:** o enunciado pede "Gerencie eventos de conexão/desconexão". O `GameHub` não sobrescreve `OnConnectedAsync` nem `OnDisconnectedAsync` — se o jogador fecha a aba ou cai a rede, ele nunca é removido da sala nem do `GameRoomManager`, e ninguém recebe `ReceivePlayerLeft`. Além disso, o único caminho de saída explícito está quebrado: `leaveHubRoom()` faz `send('leaveRoom', this.currentRoomId)` e o `SignalRTransportService` repassa esse **string** para `invoke('LeaveRoom', payload)`, enquanto `GameHub.LeaveRoom` recebe um `JoinPayload`. A ligação de argumentos falha no servidor. O relatório cita `LeaveRoom` como parte da gestão de conexões, sem ressalva.
- **Correção:** implementar `OnDisconnectedAsync` mapeando `ConnectionId → (roomId, playerId)` e chamar `RemovePlayer`; corrigir `leaveHubRoom()` para enviar `{ roomId, playerId }`. Se ficar para a próxima iteração, registrar como pendência no §10 e retirar a afirmação do §4.

### 4. Histórico de notificações na UI não foi atendido — [BLOQUEANTE]
- **Onde:** `entrega/relatorio.md:172-187` (§5)
- **Problema:** a direção de frontend é "Mostrar o histórico de notificações durante a sessão". O §5 responde com `RedisStateService` (`ListLeftPushAsync` + `ListTrimAsync`), que é servidor. No Angular não existe nenhuma lista de notificações: uma busca por `notific`/`histórico` em `frontend/src` na `LB-6` não retorna nada. O que existe é o chat do `waiting-room.component.ts`, alimentado por `GET /api/chat` com `setInterval` de 3 s — nem é notificação, nem vem do tempo real. O item não é mencionado como pendência.
- **Correção:** adicionar um painel simples que acumule os eventos recebidos por `onPlayerHealth()` / `onWallDamaged()` durante a sessão e exiba a lista; **ou** declarar o item como pendente no §10.

### 5. Capturas do fluxo funcionando — [BLOQUEANTE]
- **Onde:** `entrega/relatorio.md:306-311` (§10)
- **Problema:** o enunciado lista "Capturas do fluxo funcionando" como conteúdo obrigatório do README. Está declarado como `[PENDENTE]` — o que é honesto e não conta como fabricação —, mas o requisito segue não entregue. Nada de novo em `docs/assets` na `LB-6`.
- **Correção:** subir a infraestrutura, tirar as quatro capturas já enumeradas no próprio §10 e inseri-las.

### 6. O README do repositório não foi atualizado — [IMPORTANTE]
- **Onde:** repo, `README.md` na `LB-6`; `entrega/relatorio.md:224-273` (§8)
- **Problema:** o enunciado pede um **README** no repositório com estrutura, execução, capturas e reflexão. O `README.md` da `LB-6` ainda descreve o projeto como "Backend: .NET 8 WebAPI, C#, WebSockets", com instruções de execução que não incluem `docker compose`, Mosquitto nem Redis, e não menciona MQTT em lugar nenhum. Quem clonar a branch e seguir o README não sobe a infraestrutura.
- **Correção:** portar as seções 2, 3, 8 e 9 deste documento para o `README.md` da branch, ou ao menos acrescentar a seção de infraestrutura e um link para o relatório.

### 7. Trechos apresentados como "reproduções fiéis" foram condensados — [IMPORTANTE]
- **Onde:** `entrega/relatorio.md:14-16` (a afirmação), `:43-63`, `:134-151`
- **Problema:** o §1 declara "Os trechos de código citados são reproduções fiéis dos arquivos dessa branch". Dois blocos não são literais: (a) o `joinHubRoom` do §2 omite, sem reticências, as duas linhas de limpeza `this.mqttSubscriptions.forEach(sub => sub.unsubscribe()); this.mqttSubscriptions = [];` que abrem o `if`; (b) o `JoinRoom` do §4 escreve `players, destroyedWalls` onde o arquivo tem `room.Players.Values.ToArray<object>(), destroyedWalls.ToArray()` — `players` não existe como variável. Nada disso muda o sentido técnico, mas contradiz a promessa de fidelidade — e fidelidade é justamente o que sustenta um documento sobre código de terceiros.
- **Correção:** ou colar os trechos literais, ou trocar a frase do §1 por "trechos reproduzidos com elisões marcadas" e marcar as elisões com `// ...`.

### 8. Incompatibilidade de versões do MQTTnet no `backend.csproj` — [IMPORTANTE]
- **Onde:** repo, `backend/backend.csproj` na `LB-6`
- **Problema:** o projeto referencia `MQTTnet 5.2.0.1603` junto com `MQTTnet.Extensions.ManagedClient 4.3.7.1207`. A linha 5.x do MQTTnet removeu o namespace `MQTTnet.Client` e renomeou `MqttFactory` para `MqttClientFactory` — exatamente o que `MqttGameService.cs` usa (`using MQTTnet.Client;`, `new MqttFactory()`, `CreateManagedMqttClient()`). O pacote gerenciado 4.3.7 foi compilado contra a API 4.x. É muito provável que a compilação quebre também aqui, além do problema 2. (Sem SDK na máquina, não deu para confirmar com `dotnet build`.)
- **Correção:** alinhar as duas referências na mesma linha de versão (4.3.x nas duas, o caminho mais curto porque o código já está escrito para a API v4) e rodar `dotnet build`.

### 9. A tabela de endpoints do §3.1 está incompleta — [MENOR]
- **Onde:** `entrega/relatorio.md:119-124`
- **Problema:** faltam `PUT /api/rooms/{id}/join` (em `RoomEndpoints.cs`) e `GET`/`POST /api/chat` (em `Controllers/ChatController.cs`). A árvore do §8 também não menciona `backend/Controllers/`. Nada está errado no que foi escrito; está incompleto.
- **Correção:** acrescentar as três rotas à tabela e `Controllers/` à árvore.

## Riscos de fabricação

**Nenhum.** Foi a verificação mais cuidadosa desta revisão e o documento passa:

- Nenhum valor de latência, RTT ou vazão aparece como medido. As duas frentes de medição
  estão marcadas como `[PENDENTE]` no §10, com a frase explícita "nenhum resultado foi
  registrado no repositório".
- `scripts/benchmarks/benchmark.js` existe na `LB-6` e faz exatamente o que o §10 descreve:
  1000 mensagens, QoS 1, RTT médio/mínimo/máximo e mensagens por segundo. A descrição não
  infla o que o script faz.
- Existem números de benchmark no repositório em `docs/Lab05-activity3-*.md` e
  `docs/assets/benchmark_chart.png`, mas são do **Lab 5** e **não são citados** aqui. Bom
  sinal: não houve reaproveitamento de medição antiga como se fosse desta semana.
- Todas as afirmações técnicas verificáveis conferem com a `LB-6`: `MqttGameService`,
  `RedisStateService`, `GameRoomManager`, `MqttTransportService`, `GameHub.JoinRoom`/`LeaveRoom`,
  `IGameClient`, os tópicos `game/room/+/move`, `game/room/{sala}/events/health` e
  `.../events/wall`, o QoS `AtLeastOnce` com `RetainFlag(false)`, `ListLeftPushAsync` +
  `ListTrimAsync(key, 0, 99)`, o `app.config.ts` e as portas 5288 (`launchSettings.json`,
  perfil `http`), 1883 e 9001 (`mosquitto.conf`) e 6379 (`docker-compose.yml`).
- O detalhe "cabeçalho fixo do MQTT ocupa 2 bytes" (§9) é fato de especificação, não medição.

## Conclusão

O documento está honesto e tecnicamente correto — a fidelidade ao código da `LB-6` é boa e
não há um único número inventado. O que reprova é a **atividade**, não o texto: quatro itens
obrigatórios do enunciado não estão entregues (endpoint HTTP disparador, gestão de
desconexão, histórico de notificações na UI, capturas), e três deles nem sequer aparecem como
pendência — o §4 chega a sugerir que o endpoint existe. Some-se a isso um erro de compilação
de uma linha em `GameRoomManager.cs`, que derruba as instruções de execução do §8.

Caminho mais curto para virar o veredito: corrigir a linha 1 do `GameRoomManager.cs`, alinhar
as versões do MQTTnet, implementar o endpoint disparador e o `OnDisconnectedAsync`, tirar as
capturas — e, para o que não couber no prazo, transformar em `[PENDENTE]` explícito no §10 em
vez de deixar implícito no meio do texto. Há uma semana até 23/08.
