# Revisão — 6.2 Fórum de discussão e Resposta em pares (Programação 6, Semana 6)

**Veredito:** REPROVADO
**Revisado em:** 2026-08-23 12:39

## Cobertura do enunciado

| # | O que foi pedido | Situação | Onde está / o que falta |
|---|---|---|---|
| 1 | **D1** — Vantagens do MQTT sobre SignalR em alta concorrência (ex.: power-ups) | Atende | `post-forum.md:13-27`: fan-out pelo broker, overhead de cabeçalho, desacoplamento de consumidores. Três argumentos corretos e bem separados |
| 2 | **D1** — Como o QoS do MQTT afeta a experiência de jogo | Parcial | `post-forum.md:29-38`: o raciocínio sobre QoS 0/1/2 está correto em tese, mas é apresentado como o que o projeto faz, e não é (ver problema 1) |
| 3 | **D1** — Trade-offs de latência, confiabilidade e overhead | Atende | `post-forum.md:40-51`: tabela comparativa de cinco linhas mais o custo operacional do broker, que é o ponto normalmente esquecido |
| 4 | **D1** — Casos no capstone que justificam MQTT contra SignalR | Atende | `post-forum.md:53-60`. A divisão descrita bate com a branch `origin/LB-6` |
| 5 | **D2** — Como se priorizam eventos num jogo multijogador | Atende | `post-forum.md:64-67`: critério é a consequência de perder o evento, não a frequência |
| 6 | **D2** — Estratégias para garantir entrega de eventos críticos | Atende | `post-forum.md:69-74`: QoS 1 com consumidor idempotente, id por evento e reconstrução de estado via `ReceiveRoomState`, este último confirmado no código |
| 7 | **D2** — Otimizar comunicação para reduzir congestão | Atende | `post-forum.md:76-79`: lote de posições, frequência por distância, envio só do delta, buffer para o não crítico |
| 8 | **D2** — Impacto na UI (explosão contra pontuação) | Atende | `post-forum.md:81-85`: prever o cosmético, esperar confirmação para o que é estado |
| 9 | Resposta em pares: responder a um colega em 2 ou 3 frases | Parcial | `post-forum.md:93-107` traz dois modelos alternativos, ambos sobre a Discussão 1. Nenhum cobre a Discussão 2, que o enunciado lista como tema da resposta em pares (problema 3) |
| 10 | Resposta em pares: acrescentar detalhe da própria pesquisa | Atende | Ambos os modelos acrescentam informação nova |
| 11 | Resposta em pares: pedir mais detalhes ao colega | Atende | Ambos terminam com pergunta direta |
| 12 | Limite mínimo de palavras | Atende | Este enunciado não fixa mínimo. O post inicial tem cerca de 900 palavras e cada modelo passa de 60 |
| 13 | Escrever com as próprias palavras, sem cópia | Atende | Texto autoral, tom consistente |
| 14 | Formato `discussion_topic`, texto para colar no Canvas | Atende | `entrega/post-forum.md`, sem `.docx` — correto para este tipo de entrega |
| 15 | Prazo (2026-08-24 02:59Z) | Atende | Ainda no prazo em 23/08 |

## Problemas encontrados

### 1. Política de QoS descrita como sendo a do projeto contradiz o código da `LB-6` — [BLOQUEANTE]
- **Onde:** `entrega/post-forum.md:29-38`
- **Problema:** o texto afirma, como prática do grupo, que "Posição de tanque vai como QoS 0" e que "Captura de power-up e fim de partida vão como QoS 1". Nenhuma das duas coisas acontece na branch.
  - Posição de tanque: o cliente publica em `game/room/{id}/move` através de `MqttTransportService.publish` (`frontend/src/app/services/transport/mqtt-transport.service.ts:19`), único caminho de publicação do frontend, que usa `{ qos: 1, retain: false }` fixo, sem parâmetro. A chamada está em `frontend/src/app/services/game.service.ts:92`. Posição vai em QoS 1, não 0.
  - Captura de power-up: não existe como evento de rede. Os pickups são inteiramente locais — `physics.system.ts:388-424` faz spawn e remoção no `MapStore` do cliente, e não há tópico MQTT nem método de hub para isso.
  - Fim de partida: também não é publicado. O cronômetro chega a zero em `GameRoomManager.TickRoomTime`, que apenas descarta o `Timer`; nenhum evento é emitido.
  - No backend, `MqttGameService.PublishEventAsync` aplica `MqttQualityOfServiceLevel.AtLeastOnce` a tudo que publica, sem diferenciação por tópico. A escolha por mensagem, que é o argumento central do parágrafo, não está implementada em lugar nenhum.
- **Correção:** duas saídas honestas. Ou reescrever separando conceito de implementação: "o MQTT permite escolher QoS por mensagem; hoje publicamos tudo em QoS 1, e o próximo passo seria baixar a posição para QoS 0, já que um pacote perdido é corrigido pelo seguinte". Ou implementar de fato: expor `qos` como parâmetro em `MqttTransportService.publish` e passar 0 na chamada de `move` em `game.service.ts:92`. A primeira opção resolve em cinco minutos e continua sendo uma boa resposta.

### 2. Cabeçalho promete números de benchmark que o texto não tem — [IMPORTANTE]
- **Onde:** `entrega/post-forum.md:4-5`
- **Problema:** a nota de abertura diz que as respostas se apoiam "no que o grupo implementou no capstone Battle Tanks, incluindo os números do benchmark que rodamos". Não há um único número no post inteiro — nem latência, nem throughput, nem tamanho de payload. A frase cria expectativa de dado medido que o texto não entrega, e é o tipo de afirmação que, se o avaliador cobrar, não tem como ser sustentada.
- **Correção:** ou remover a menção ao benchmark, ou trazer de fato um número de `scripts/benchmarks/benchmark.js`, que já existe no repositório, citando a origem. Como essa nota é meta-instrução e não vai para o Canvas, o mais simples é apagá-la.

### 3. Nenhum modelo de resposta em pares cobre a Discussão 2 — [IMPORTANTE]
- **Onde:** `entrega/post-forum.md:89-107`
- **Problema:** o enunciado lista, sob "Resposta da Discussão em Pares", os dois temas: "Discussão 1: Escalabilidade de SignalR vs MQTT" e "Discussão 2: Priorização de Eventos em Sistemas em Tempo Real". O Modelo A responde a quem defendeu só SignalR e o Modelo B responde sobre QoS — ambos são Discussão 1. Se o colega escolhido tiver postado sobre priorização de eventos, não há material preparado.
- **Correção:** acrescentar um Modelo C voltado à Discussão 2, por exemplo sobre reconstrução de estado ao reconectar em vez de tentar garantir a entrega de toda mensagem, fechando com pergunta sobre como o colega trata quem cai no meio da partida.

### 4. A nota interna sobre número de colegas está errada — [MENOR]
- **Onde:** `entrega/post-forum.md:91`
- **Problema:** a linha diz "As instruções pedem resposta a dois colegas". O enunciado desta tarefa diz o contrário: "Responda à discussão anterior de um dos seus colegas em 2 ou 3 frases". Quem pede resposta a dois colegas é o fórum de Arquitetura de Software 2 da Semana 7, não este. Ter dois modelos preparados não é problema; o problema é a instrução errada, que pode levar a postar duas respostas onde se pedia uma.
- **Correção:** trocar por "As instruções pedem resposta a um colega, em 2 ou 3 frases. Escolha um modelo e adapte."

### 5. Modelos de resposta no limite superior do tamanho pedido — [MENOR]
- **Onde:** `entrega/post-forum.md:93-107`
- **Problema:** o enunciado pede 2 ou 3 frases. Os dois modelos têm 3 frases cada, todas longas. Está dentro da regra, mas nenhuma é curta.
- **Correção:** aparar a segunda frase de cada modelo. Ajuste de forma, não de conteúdo.

### 6. Meta-instruções misturadas ao texto a ser colado — [MENOR]
- **Onde:** `entrega/post-forum.md:1-7`, `89-93`, `101`
- **Problema:** o arquivo mistura o texto do fórum com títulos de parte, notas em blockquote e os rótulos "Modelo A" e "Modelo B". É útil como rascunho, mas nada disso pode ir para o Canvas.
- **Correção:** ao colar, levar só o conteúdo das Discussões 1 e 2 no post inicial e, depois, um único modelo adaptado como resposta ao colega.

## Riscos de fabricação

Duas afirmações apresentadas como fato da implementação e não sustentadas pela branch `origin/LB-6`:

1. **FABRICADO** — "Posição de tanque vai como QoS 0" (`post-forum.md:31`). O único publicador do frontend usa `qos: 1` fixo (`mqtt-transport.service.ts:19`) e o backend publica tudo com `AtLeastOnce` (`MqttGameService.PublishEventAsync`). Não existe publicação em QoS 0 no projeto.
2. **FABRICADO** — "Captura de power-up e fim de partida vão como QoS 1" (`post-forum.md:32-33`). Nenhum dos dois eventos é publicado por MQTT. Pickups vivem só no cliente (`physics.system.ts:388-424`, `map.store.ts:137-150`); o fim do cronômetro em `GameRoomManager.TickRoomTime` não emite evento algum. A parte do "QoS 1" é verdadeira por acidente, já que tudo que é publicado usa QoS 1, mas os eventos citados não existem.

Uma afirmação sem lastro, ainda que sem número inventado:

3. **Sem origem rastreável** — "incluindo os números do benchmark que rodamos" (`post-forum.md:5`). Não há números no texto. Existe `scripts/benchmarks/benchmark.js` no repositório, mas nada dele é citado aqui.

O restante foi conferido contra a branch e está correto:

- "chat, entrar e sair de sala e o cronômetro ficaram no SignalR" — confere: `GameHub.SendChatMessage`, `GameHub.JoinRoom` e `LeaveRoom`, e `ReceiveTimeLeft` emitido por `GameRoomManager.TickRoomTime` via `IHubContext`.
- "Dano e destruição de parede foram para o MQTT, combinados com Redis" — confere: `GameRoomManager.UpdatePlayerHealthAsync` publica em `game/room/{roomId}/events/health` e grava no Redis; `AddDestroyedWallAsync` publica em `game/room/{roomId}/events/wall` e grava no Redis. O frontend assina os dois tópicos em `game.service.ts:67-70`.
- "o `ReceiveRoomState` devolve a semente do mapa e a lista de paredes destruídas" — confere literalmente: `IGameClient.ReceiveRoomState(int mapSeed, int timeLeft, object[] players, string[] destroyedWalls)`, chamado em `GameHub.JoinRoom` com `room.MapSeed` e as paredes vindas do Redis.
- "Não usamos QoS 2 no projeto" — confere, nada usa QoS 2.
- "O cabeçalho fixo do MQTT ocupa 2 bytes" — correto, é o mínimo do fixed header do protocolo.
- SignalR exigir backplane, normalmente Redis, para escalar horizontalmente — correto.
- QoS 2 usar handshake de quatro vias (PUBLISH, PUBREC, PUBREL, PUBCOMP) — correto.
- Idempotência tornar QoS 1 suficiente — argumento correto e bem colocado.

## Conclusão

O post é bom: as oito perguntas estão respondidas com profundidade, a divisão SignalR/MQTT descrita bate exatamente com o código da `LB-6`, e a citação do `ReceiveRoomState` mostra leitura real do repositório. O que reprova é um parágrafo só — a política de QoS por evento, apresentada como decisão do grupo quando o projeto publica tudo em QoS 1 e nem sequer emite os eventos de power-up e fim de partida citados. Reescrever esse trecho separando conceito de implementação, apagar a promessa de números de benchmark, corrigir a nota de "dois colegas" e acrescentar um modelo de resposta para a Discussão 2 deixa a entrega pronta.
