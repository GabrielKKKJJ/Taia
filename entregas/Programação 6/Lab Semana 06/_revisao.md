# Revisão — A.6 Laboratório Semana 6 (Programação 6)

**Veredito:** REPROVADO
**Revisado em:** 2026-08-16 21:15

Escopo conferido: `entrega/relatorio.md` + o `.docx` gerado, contra `_contexto/enunciado.md`,
`_contexto/meta.json`, `_contexto/materiais/a-0-instrucoes-para-laboratorios.md` e o código
real da branch **`origin/LB-6`** do repositório do grupo
(`c:\Users\Djordan\Documents\www\capstone`, lido apenas com `git show` / `git ls-tree` /
`git grep`, sem checkout e sem qualquer alteração).

**Leitura do veredito.** O texto é bom e é **honesto**: as citações de código conferem com a
`LB-6` quase caractere a caractere, a análise de QoS é correta e não há **nenhum número
fabricado** — o benchmark não executado está declarado em dois lugares, com a frase certa
("sem rodar, os valores seriam invenção"). O que reprova são **entregáveis obrigatórios que
não existem**: capturas de tela, medição, teste de integração, os arquivos
`Lab06-activityN-*.md` e o `Lab06.pdf` no repositório — mais um **erro de compilação** no
backend. E o prazo é **hoje**.

## Cobertura do enunciado

| # | O que foi pedido | Situação | Onde está / o que falta |
|---|---|---|---|
| 1 | **Ativ. 1** — instalar um message broker (RabbitMQ / Mosquitto / emqx) | Atende | Mosquitto em `scripts/docker-compose.yml` + `scripts/mosquitto.conf`. O enunciado dá escolha; usar Mosquitto no lugar do emqx é opção válida, e o §2.1 justifica |
| 2 | **Ativ. 1** — integrar MQTT em C# .NET com MQTTnet | Atende (com defeito de build) | `backend/Services/MqttGameService.cs`, `IHostedService`, `CreateManagedMqttClient`. Ver problema 4 sobre as versões do pacote |
| 3 | **Ativ. 1** — conectar pelo Angular (ngx-mqtt / mqtt.js / paho-mqtt) | Atende | `app.config.ts` com `MqttModule.forRoot({ connectOnCreate: true, url: 'ws://localhost:9001' })` e `MqttTransportService` — citação exata no §2.3 |
| 4 | **Ativ. 1** — benchmarking: medir recepção de power-ups e comparar com SignalR | **Não atende** | `scripts/benchmarks/benchmark.js` existe e está correto, mas **nunca foi executado**. Declarado como `[PENDENTE]` no §2.4. Ver problema 1 |
| 5 | **Ativ. 1** — relatório com comparação SignalR × MQTT | Atende | §3.4 e §2, com critério explícito ("se o evento só faz sentido dentro da sessão, é SignalR") |
| 6 | **Ativ. 1** — **gráficos de latência e congestionamento** | **Não atende** | Nenhum gráfico. Consequência direta do item 4 |
| 7 | **Ativ. 2** — backend publica eventos no MQTT | Atende | `GameRoomManager.UpdatePlayerHealthAsync` e `AddDestroyedWallAsync` chamam `_mqtt.PublishEventAsync` para `game/room/{roomId}/events/health` e `.../events/wall`. §3.2 confere |
| 8 | **Ativ. 2** — frontend se inscreve nos eventos | Atende | `game.service.ts:joinHubRoom()` assina os três tópicos; `physics.system.ts` consome `onPlayerHealth()` e `onWallDamaged()` |
| 9 | **Ativ. 2** — análise de QoS e de tópicos MQTT | Atende | §3.1 e §3.3. A hierarquia declarada bate com o código, e a justificativa de QoS 1 + `RetainFlag(false)` está correta e bem argumentada |
| 10 | **Ativ. 2** — quando SignalR e quando MQTT | Atende | §3.4, tabela |
| 11 | **Ativ. 3** — armazenamento no Redis | Atende | `RedisStateService`: `ListLeftPushAsync` + `ListTrimAsync(key, 0, 99)` para eventos, `HashSetAsync`/`HashGetAllAsync` para paredes. §4.1 confere |
| 12 | **Ativ. 3** — recuperação do histórico ao entrar numa sala | Atende | `GameHub.JoinRoom` chama `GetDestroyedWallsAsync` e devolve por `Clients.Caller.ReceiveRoomState(mapSeed, timeLeft, players, destroyedWalls)`. §4.2 confere |
| 13 | **Ativ. 3** — **teste de integração** (eventos gravados e recuperados) | **Não atende** | §4.3 é só um `[PENDENTE]`. Não há teste automatizado nem registro manual. `backend.Tests/` só tem `AuthServiceTests.cs` e `UnitTest1.cs` na `LB-6`. Ver problema 2 |
| 14 | Documento com **títulos claros por atividade** | Atende | §2, §3 e §4, um por atividade |
| 15 | Documento com **2–3 parágrafos de explicação por atividade** | Atende | Todas as três excedem o mínimo, com subseções |
| 16 | Documento com **capturas de tela do processo** | **Não atende** | §6 lista cinco `[PENDENTE]` e nenhuma imagem. Ver problema 3 |
| 17 | Documento com **referências bibliográficas** | Atende | §8 — MQTTnet, ngx-mqtt, OASIS MQTT 5.0, Mosquitto, Redis, MS SignalR Groups. Todas pertinentes à semana |
| 18 | Documento com **conclusões sobre o andamento do projeto final** | Atende | §7, com as três frentes abertas (medir, segurança, servidor autoritativo). É a melhor seção do documento |
| 19 | Entregável: **`Lab06.pdf`** | **Não atende** | O que existe é um `.docx`. E no repositório não há nenhum `Lab06*`. Ver problema 5 |
| 20 | Entregável: **`Lab06-activity1/2/3-studentName.md`** no repositório / wiki | **Não atende** | `git ls-tree origin/LB-6 -- docs` só traz `Lab04*` e `Lab05*`. Ver problema 5 |
| 21 | Entregável: arquivos atualizados no repositório GitLab | Atende | Commits `5290c38` (MQTT + Redis) e `6e3c7cf` (benchmark) na `LB-6` |
| 22 | Critério de avaliação: **Integração com NgRx** | Parcial | Os stores existem (`store/game.store.ts`, `map.store.ts`, `players.store.ts`, NgRx Signals), mas o relatório **não menciona NgRx nem os stores em nenhum ponto**. Ver problema 6 |
| 23 | Recomendação de nomenclatura de branch `LB-6/[nome]` | Parcial | A branch é `LB-6`, sem sufixo; as mensagens de commit seguem Conventional Commits em vez de `LB-6#N.`. É recomendação, não obrigação — não pesa |
| 24 | Formato de entrega: `online_upload` | Parcial | `.docx` gerado (16/08 21:09). O enunciado pede PDF — ver item 19 |
| 25 | Prazo | **Vence hoje** | `meta.json`: 16/08/2026 23:59. Restam poucas horas |

## Problemas encontrados

### 1. O benchmark nunca foi executado — a atividade 1 fica sem seu resultado central — [BLOQUEANTE]
- **Onde:** `entrega/relatorio.md:133-151` (§2.4) e `:325` (§6)
- **Problema:** a instrução 4 da Atividade #1 é "Medir os tempos de recepção de power-ups e comparar com o SignalR", e os entregáveis pedem "Gráficos de latência e congestionamento". A rubrica tem uma linha inteira para isso ("Benchmarking: nenhuma medição ou análise" = D-F). O script `scripts/benchmarks/benchmark.js` está commitado e correto — mede RTT médio/mínimo/máximo e vazão sobre 1000 mensagens de ~250 bytes com QoS 1 —, mas nenhuma saída foi registrada. Além disso, o script só mede **MQTT**: não há contraparte SignalR, embora `@microsoft/signalr` esteja em `scripts/benchmarks/package.json`. A declaração de pendência é exemplar e **não** é falha de honestidade; a falha é o requisito em aberto.
- **Correção:** subir a infraestrutura, rodar `node scripts/benchmarks/benchmark.js`, colar a saída no §2.4 e montar ao menos um gráfico simples. Para a comparação, escrever o equivalente com `@microsoft/signalr` contra o `GameHub` — a dependência já está instalada.

### 2. Teste de integração MQTT + Redis ausente — [BLOQUEANTE]
- **Onde:** `entrega/relatorio.md:290-295` (§4.3); repo `backend.Tests/` na `LB-6`
- **Problema:** a instrução 3 da Atividade #3 é "Verifique se os eventos do MQTT são armazenados no Redis e recuperados ao entrar em uma sala", e a rubrica avalia "Testes de integração". O §4.3 descreve o roteiro certo mas o deixa inteiro como `[PENDENTE]`. Em `backend.Tests/` só existem `AuthServiceTests.cs` e o `UnitTest1.cs` de esqueleto — nada toca `RedisStateService`, `MqttGameService` ou `GameRoomManager`.
- **Correção:** executar o roteiro que o próprio §4.3 já escreveu (dois clientes, destruir parede, reconectar, `LRANGE room:<sala>:events 0 -1`) e registrar a saída e as capturas; melhor ainda, adicionar um teste em `backend.Tests` sobre `RedisStateService`.

### 3. Nenhuma captura de tela — [BLOQUEANTE]
- **Onde:** `entrega/relatorio.md:315-325` (§6)
- **Problema:** "Capturas de tela do processo" é item explícito do documento pedido pelo enunciado, e "Capturas de tela do progresso do projeto final" é entregável da Atividade #1. As cinco estão listadas como `[PENDENTE]` e nenhuma foi produzida. Não há imagem nova em `docs/assets` na `LB-6`. Um laboratório sem captura nenhuma perde a evidência de que o ambiente rodou.
- **Correção:** as cinco capturas já estão especificadas no §6 — bastam alguns minutos com a infraestrutura no ar. Além disso, distribuí-las pelas seções das atividades em vez de agrupá-las no fim, porque o enunciado pede captura *por atividade*.

### 4. `GameRoomManager.cs` não compila — o backend não sobe — [BLOQUEANTE]
- **Onde:** repo, `backend/Services/GameRoomManager.cs` linhas 1 e 8 na `LB-6`; impacto em `entrega/relatorio.md:299-313` (§5)
- **Problema:** o arquivo declara **duas vezes** o namespace em forma *file-scoped*:

  ```csharp
  namespace backend.Services;      // linha 1

  using System.Collections.Concurrent;
  using Microsoft.AspNetCore.SignalR;
  using backend.Hubs;
  using System.Threading;

  namespace backend.Services;      // linha 8
  ```

  C# admite uma única declaração *file-scoped* por arquivo e nenhuma declaração de namespace
  dentro do corpo dela — erro de compilação (família CS8955/CS8956), não aviso. O `dotnet run`
  do §5 falha, e por tabela todos os `[PENDENTE]` de captura e medição ficam impossíveis de
  fechar antes disso. (Não deu para confirmar com o compilador: a máquina só tem runtimes
  .NET 6/10, sem SDK. A regra de linguagem, porém, não abre exceção.)
  
  Some-se a isso o `backend.csproj`, que referencia `MQTTnet 5.2.0.1603` junto com
  `MQTTnet.Extensions.ManagedClient 4.3.7.1207`. A linha 5.x removeu o namespace
  `MQTTnet.Client` e renomeou `MqttFactory` para `MqttClientFactory` — exatamente o que
  `MqttGameService.cs` usa. É bem provável que a compilação quebre também aí.
- **Correção:** apagar a linha 1 de `GameRoomManager.cs`; alinhar as duas referências do
  MQTTnet na mesma linha de versão (4.3.x nas duas é o caminho mais curto, porque o código já
  está escrito para a API v4); rodar `dotnet build` antes de qualquer outra coisa.

### 5. Os entregáveis nomeados pelo enunciado não existem — [BLOQUEANTE]
- **Onde:** `_contexto/enunciado.md:64`, `:107`, `:202`, `:281`; repo `docs/` na `LB-6`; `entrega/`
- **Problema:** o enunciado nomeia quatro arquivos: `Lab06.pdf` (o documento do laboratório) e `Lab06-activity1/2/3-studentName.md` (um por atividade, no repositório ou na wiki). Na `LB-6` a pasta `docs/` só contém `Lab04*`, `Lab05*` e `docs/wiki/`, nada de Lab 6. Na pasta de entrega há um `.docx`, não um PDF. O conteúdo dos três relatórios de atividade está todo escrito — só não está no formato nem no lugar pedidos.
- **Correção:** exportar o documento como `Lab06.pdf` e fazer o upload nesse formato; e recortar os §2, §3 e §4 em `docs/Lab06-activity1-<nome>.md`, `docs/Lab06-activity2-<nome>.md` e `docs/Lab06-activity3-<nome>.md`, commitando na `LB-6` como já foi feito para os labs 4 e 5.

### 6. A rubrica avalia "Integração com NgRx" e o relatório não fala de NgRx — [IMPORTANTE]
- **Onde:** `_contexto/enunciado.md:154` (critério da Atividade #1); `entrega/relatorio.md` inteiro
- **Problema:** um dos quatro aspectos avaliados na Atividade #1 é "Integração com NgRx". O documento não menciona NgRx, SignalStore, `PlayersStore`, `MapStore` ou `GameStore` uma única vez, embora eles existam em `frontend/src/app/store/` e sejam o destino final dos eventos MQTT (via `physics.system.ts`). O trabalho foi feito e não foi contado.
- **Correção:** acrescentar ao §2.3 ou ao §3 um parágrafo curto mostrando o caminho completo — `MqttTransportService.onTopic()` → `Subject` em `game.service.ts` → `physics.system.ts` → `playersStore` / `mapStore` — e por que os eventos MQTT entram no estado reativo pelos stores em vez de irem direto ao componente.

### 7. Trechos apresentados como "reproduções fiéis" foram condensados — [IMPORTANTE]
- **Onde:** `entrega/relatorio.md:13-14` (a afirmação), `:51-60`, `:176-190`, `:239-245`
- **Problema:** o §1 afirma "Os trechos de código citados são reproduções fiéis dos arquivos dessa branch". Três blocos não são literais: (a) o `docker-compose.yml` do §2.1 aparece com `ports` em forma inline e sem `version`, `restart: always` e o volume `redis_data` do arquivo real; (b) os dois métodos do `GameRoomManager` no §3.2 aparecem sem os invólucros `if (_rooms.TryGetValue(roomId, out var room) ...)` que existem no arquivo, e sem marcação de elisão; (c) o `AddEventAsync` do §4.1 troca `string eventJson` por `var eventJson` e omite a linha `string key = $"room:{roomId}:events";`, o que deixa `key` indefinido no trecho citado. O sentido técnico não muda em nenhum caso, mas a promessa de fidelidade é o que sustenta um documento que descreve código de terceiros.
- **Correção:** colar os trechos literais (ou marcar as elisões com `// ...`), ou trocar a frase do §1 por "trechos reproduzidos com elisões marcadas".

### 8. Prazo vence hoje — [IMPORTANTE]
- **Onde:** `_contexto/meta.json`, `"prazo": "2026-08-17T02:59:59Z"` (16/08 23:59 UTC-3)
- **Problema:** restam poucas horas e há cinco bloqueantes, três dos quais (benchmark, teste de integração, capturas) exigem a infraestrutura no ar — que por sua vez depende de corrigir a compilação do backend.
- **Correção:** ordem sugerida: (1) corrigir `GameRoomManager.cs` e as versões do MQTTnet; (2) `docker compose up -d` + `dotnet run` + `npm start`; (3) capturas; (4) `node benchmark.js` e colar a saída; (5) roteiro do §4.3; (6) exportar `Lab06.pdf`.

## Riscos de fabricação

**Nenhum.** Este foi o ponto mais verificado da revisão, e o documento passa com folga:

- Não existe **um único** valor de latência, RTT ou vazão apresentado como medido. As duas
  frentes de medição estão marcadas como `[PENDENTE]` no §2.4 e no §6, e o §7 repete a
  pendência por escrito ("o benchmark está escrito mas não foi executado, e sem números a
  comparação entre SignalR e MQTT continua sendo argumento, não evidência"). A frase "sem
  rodar, os valores seriam invenção" no §2.4 é exatamente a postura correta.
- `scripts/benchmarks/benchmark.js` existe na `LB-6` e o trecho citado no §2.4
  (`const rtt = performance.now() - payload.t; ...`) é literal. As grandezas descritas
  (RTT médio/mínimo/máximo e vazão) são as que o script realmente imprime, e o payload de
  ~250 bytes com QoS 1 confere com `"x".repeat(200)` e `{ qos: 1 }`.
- Há números de benchmark no repositório, em `docs/Lab05-activity3-*.md`, `docs/Lab5P6-*.md` e
  `docs/assets/benchmark_chart.png`, mas são do **Lab 5** e **não são citados** neste
  documento. Nenhum reaproveitamento de medição antiga como se fosse desta semana.
- Todas as afirmações técnicas verificáveis conferem com a `LB-6`: `mosquitto.conf` (as sete
  linhas citadas são idênticas ao arquivo), portas 1883/9001/6379/5288 (`mosquitto.conf`,
  `docker-compose.yml`, `launchSettings.json` perfil `http`), `app.config.ts`,
  `MqttTransportService.publish`/`onTopic` (literais), `SubscribeAsync("game/room/+/move")`,
  `MqttQualityOfServiceLevel.AtLeastOnce` com `WithRetainFlag(false)`, `ListLeftPushAsync` +
  `ListTrimAsync(key, 0, 99)`, `HashSetAsync`/`HashGetAllAsync`, `GameHub.JoinRoom` com
  `Clients.Caller`/`Clients.OthersInGroup`, `IGameClient.ReceiveRoomState`, e
  `_redis.ClearRoomStateAsync(roomId).GetAwaiter().GetResult()` em `RemovePlayer`.
- O `docker-compose.yml` do §2.1 é a única citação com divergência de forma — condensada, não
  falsa. Está registrada no problema 7 como fidelidade, não como fabricação.

## Conclusão

O relatório é o melhor texto que este grupo produziu até aqui: fiel ao código, com análise de
QoS correta e uma conclusão que enxerga as próprias limitações. Não há nada inventado. O
problema é que o laboratório **não foi executado**: sem capturas, sem medição e sem o teste de
integração, três dos quatro critérios da rubrica da Atividade #1 e um da Atividade #3 caem em
"Não implementado", e o backend nem compila por causa de uma linha duplicada em
`GameRoomManager.cs`.

Como o prazo vence hoje às 23:59, a prioridade é operacional, não textual: corrigir o
namespace e as versões do MQTTnet, subir `docker compose` + backend + frontend, tirar as
cinco capturas, rodar o `benchmark.js` e colar a saída, e exportar como `Lab06.pdf`. Se algo
tiver de ficar de fora, que fiquem os arquivos `Lab06-activityN-*.md` no repositório — são os
mais fáceis de acrescentar depois e os que menos pesam na rubrica.
