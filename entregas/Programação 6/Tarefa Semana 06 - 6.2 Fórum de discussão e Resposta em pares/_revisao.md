# Revisão — 6.2 Fórum de discussão e Resposta em pares (Programação 6, Semana 6)

**Veredito:** APROVADO COM RESSALVAS
**Revisado em:** 2026-08-23 13:13 (UTC-3) — 2ª rodada

> 1ª rodada: REPROVADO (1 bloqueante — política de QoS descrita como prática do grupo contradizia o
> código). **Fechado.** Nenhum bloqueante restante.

## Cobertura do enunciado

| # | O que foi pedido | Situação | Onde está / o que falta |
|---|---|---|---|
| 1 | **D1** — Vantagens do MQTT sobre SignalR em alta concorrência | Atende | `post-forum.md:13-27`: fan-out pelo broker, overhead de cabeçalho, desacoplamento |
| 2 | **D1** — Como o QoS afeta a experiência de jogo | Atende (era Parcial) | `post-forum.md:29-43`: agora separa o que o protocolo permite do que o projeto faz |
| 3 | **D1** — Trade-offs de latência, confiabilidade e overhead | Atende | Tabela de cinco linhas + custo operacional do broker |
| 4 | **D1** — Casos no capstone | Atende | `post-forum.md:58-69`, confere com `origin/LB-6` |
| 5 | **D2** — Como priorizar eventos | Atende | `post-forum.md:72-76` |
| 6 | **D2** — Garantir entrega do crítico | Atende | QoS 1 idempotente, id por evento, `ReceiveRoomState` |
| 7 | **D2** — Reduzir congestão | Atende | Lote, frequência por distância, delta, buffer do não crítico |
| 8 | **D2** — Impacto na UI | Atende | Prever o cosmético, esperar confirmação para o que é estado |
| 9 | Resposta em pares a um colega, 2 ou 3 frases | Parcial | Dois modelos, ambos sobre a Discussão 1; nada preparado para a Discussão 2 (problema 1) |
| 10 | Acrescentar detalhe da própria pesquisa | Atende | Os dois modelos acrescentam informação |
| 11 | Pedir mais detalhes ao colega | Atende | Os dois terminam em pergunta direta |
| 12 | Texto autoral, sem mínimo de palavras fixado | Atende | Cerca de 900 palavras no post inicial |
| 13 | Formato `discussion_topic` | Atende | `entrega/post-forum.md`, sem `.docx` — correto para este tipo |
| 14 | Prazo (2026-08-24 02:59Z) | Atende | Ainda no prazo |

### Verificação do bloqueante contra `origin/LB-6` (somente leitura)

O texto corrigido afirma três coisas sobre a implementação. As três foram conferidas no código:

- "hoje publicamos tudo com QoS 1, sem diferenciação — o cliente Angular usa `qos: 1` fixo no
  `publish`" — confere. `frontend/src/app/services/transport/mqtt-transport.service.ts:18-20`:
  `unsafePublish(topic, JSON.stringify(message), { qos: 1, retain: false })`, sem parâmetro de QoS.
- "e o backend publica com `AtLeastOnce` em todos os tópicos" — confere. Há um único ponto de
  publicação no backend, `backend/Services/MqttGameService.cs:87`, com
  `.WithQualityOfServiceLevel(MqttQualityOfServiceLevel.AtLeastOnce)`. Nenhuma outra ocorrência de
  QoS em código C# na branch.
- "power-up hoje é resolvido localmente no cliente, sem passar nem pelo hub nem pelo broker" —
  confere. Busca por `powerup`/`pickup` no backend não retorna nada; no frontend aparece apenas em
  `models/pickup.model.ts`, `systems/physics.system.ts`, `store/map.store.ts`,
  `canvas-renderer.service.ts` e `game-engine.service.ts`.

A diferenciação de QoS por tipo de evento agora está apresentada como proposta ("A diferenciação que
faz sentido, e que pretendo propor ao grupo") e a §D2 repete a ressalva ("o que ainda não fazemos").
A promessa de "números do benchmark que rodamos" no cabeçalho foi removida — problema 2 da 1ª rodada
também fechado.

## Problemas encontrados

### 1. Nenhum modelo de resposta cobre a Discussão 2 — [IMPORTANTE] (pendente da 1ª rodada)
- **Onde:** `entrega/post-forum.md:98-116`
- **Problema:** o enunciado lista os dois temas sob "Resposta da Discussão em Pares". O Modelo A
  responde a quem defendeu só SignalR e o Modelo B trata de QoS: ambos são Discussão 1. Se o colega
  escolhido tiver postado sobre priorização de eventos, não há material preparado.
- **Correção:** um Modelo C sobre reconstrução de estado ao reconectar, fechando com pergunta sobre
  como o colega trata quem cai no meio da partida.

### 2. A nota interna sobre número de colegas continua errada — [MENOR] (pendente da 1ª rodada)
- **Onde:** `entrega/post-forum.md:100`
- **Problema:** "As instruções pedem resposta a dois colegas". O enunciado desta tarefa diz
  "Responda à discussão anterior de **um** dos seus colegas em 2 ou 3 frases"
  (`_contexto/enunciado.md:34`). Quem pede dois é o fórum de Arquitetura de Software 2 da Semana 7.
  Ter dois modelos preparados não é problema; a instrução errada pode levar a postar duas respostas.
- **Correção:** "As instruções pedem resposta a um colega, em 2 ou 3 frases. Escolha um modelo e
  adapte."

### 3. Modelos no limite superior do tamanho pedido — [MENOR]
- **Onde:** `post-forum.md:104-116` — três frases longas cada. Dentro da regra, nenhuma curta.

### 4. Meta-instruções misturadas ao texto a colar — [MENOR]
- **Onde:** `post-forum.md:1-7`, `98-102` — títulos de parte, blockquotes e os rótulos "Modelo A" e
  "Modelo B" não podem ir para o Canvas. Levar só as Discussões 1 e 2 e, depois, um único modelo
  adaptado.

## Riscos de fabricação

**Nenhum.** As duas afirmações marcadas como FABRICADO na 1ª rodada ("posição de tanque vai como
QoS 0" e "captura de power-up e fim de partida vão como QoS 1") desapareceram, e o que ficou no lugar
foi conferido linha a linha contra `origin/LB-6` — bate. Não há número apresentado como medido em
nenhum ponto do post; a promessa de benchmark no cabeçalho foi removida. As afirmações de teoria
(cabeçalho fixo de 2 bytes, handshake de quatro vias do QoS 2, backplane Redis do SignalR) seguem
corretas, e a divisão SignalR/MQTT do capstone continua confirmada no código.

## Conclusão

O bloqueante foi resolvido do jeito certo: em vez de inventar uma implementação, o texto assume o
estado atual ("hoje publicamos tudo com QoS 1") e apresenta a diferenciação como proposta — o que,
além de honesto, é uma resposta melhor de fórum. Dá para postar assim. Antes de colar, vale
acrescentar um modelo de resposta voltado à Discussão 2, corrigir a nota de "dois colegas" para um, e
retirar as meta-instruções do que vai para o Canvas.

Prazo: hoje, 23/08/2026 às 23:59 (UTC-3).
