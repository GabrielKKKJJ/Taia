---
titulo: Tarefa 6 - Arquitetura de Software 2
atividade: Redesenho da Grades API do Prometheus V2 — Escalabilidade e Resiliência
---

## 1. Escopo e premissas

A atividade pede a seleção de um módulo do Prometheus V2 com desafios de carga ou
disponibilidade, a análise de suas limitações e uma proposta arquitetural que integre uma
estratégia de escalonamento, um padrão de resiliência e o uso de serviços de nuvem.

O componente escolhido é a **Grades API**, sugerida pelo próprio enunciado. A escolha não é
arbitrária: entre os módulos do sistema, é o que combina três características que tornam o
problema interessante — carga fortemente concentrada no tempo, leitura muito mais frequente
que escrita, e consequência alta em caso de indisponibilidade.

**Premissa declarada.** O material do curso descreve o caso Prometheus qualitativamente,
sem métricas publicadas do V1. Os números usados adiante são, portanto, um **cenário de
carga assumido** para dar concretude ao dimensionamento, e estão marcados como tal. Eles
servem para justificar decisões, não para relatar medições.

## 2. Análise do componente atual

### 2.1. O que a Grades API faz

Concentra publicação de avaliações pelo professor, consulta de notas pelo aluno, cálculo de
média e situação, e emissão de histórico. É o módulo que o aluno mais consulta e o que o
professor menos usa — assimetria que a arquitetura atual ignora.

### 2.2. Limitações identificadas

**Carga concentrada, não distribuída.** Notas não são consultadas uniformemente ao longo do
semestre. Elas são consultadas em rajada, minutos depois de o professor publicar, e no
fechamento do período. Uma arquitetura dimensionada para a média fica ociosa 95% do tempo e
cai justamente no momento em que todo mundo olha.

*Cenário assumido:* 8.000 alunos ativos, consulta média de 2 req/s, com picos de 400 req/s
nos 10 minutos após uma publicação em massa — uma razão de 200× entre pico e média.

**Leitura e escrita no mesmo caminho.** Cada consulta de nota recalcula média e situação a
partir das avaliações. Isso significa que uma operação predominantemente de leitura carrega
o custo de agregação a cada requisição, e que o banco transacional recebe carga de leitura
que não precisaria chegar até ele.

**Acoplamento síncrono com módulos vizinhos.** Publicar uma nota dispara notificação ao
aluno. Se o Messaging Service estiver lento, a publicação fica lenta junto — o professor
espera por um subsistema que não deveria estar no caminho crítico da sua ação. Pior: se o
Messaging cair, a publicação falha, e uma operação que deveria ter sido concluída é
revertida por causa de um efeito colateral secundário.

**Falha sem contenção.** Sem *timeout* e sem disjuntor, uma dependência degradada consome
threads do serviço chamador até esgotá-las. O resultado é que a lentidão de um módulo
periférico derruba a Grades API inteira — o padrão de falha em cascata.

## 3. Design proposto

```mermaid Figura 1 — Grades API redesenhada, com CQRS, cache e assincronismo
flowchart LR
  CLI["Aluno / Professor"]
  CDN["CDN<br/>estáticos e histórico"]
  GW["API Gateway<br/>rate limit · autenticação"]
  LB{{"Load Balancer"}}

  subgraph ESCRITA["Caminho de escrita"]
    CMD["Grades Command<br/>2 a 4 instâncias"]
    DBW[("PostgreSQL<br/>primário")]
  end

  subgraph LEITURA["Caminho de leitura"]
    QRY["Grades Query<br/>auto-scaling 3 a 20"]
    CACHE[("Redis<br/>média e situação")]
    DBR[("Réplicas<br/>de leitura")]
  end

  BUS{{"Fila de eventos<br/>NotaPublicada"}}
  MSG["Messaging Service"]
  PROJ["Projetor<br/>recalcula e invalida"]

  CLI --> CDN
  CLI --> GW
  GW --> LB
  LB --> CMD
  LB --> QRY
  CMD --> DBW
  CMD -- "publica evento" --> BUS
  BUS --> MSG
  BUS --> PROJ
  PROJ --> CACHE
  DBW -- "replicação" --> DBR
  QRY --> CACHE
  QRY -. "miss" .-> DBR

  classDef esc fill:#fee2e2,stroke:#ef4444
  classDef lei fill:#dcfce7,stroke:#22c55e
  classDef inf fill:#dbeafe,stroke:#3b82f6
  class ESCRITA esc
  class LEITURA lei
  class GW,LB,CDN,BUS inf
```

### 3.1. Estratégia de escalonamento: horizontal, com separação leitura/escrita

A escolha é **escalonamento horizontal**, e a razão é a forma da carga. Escalonamento
vertical — uma máquina maior — não serve para picos de 200×: exigiria dimensionar
permanentemente para o pior caso, pagando por capacidade ociosa quase o tempo todo, e
esbarraria num teto físico.

A decisão que torna o horizontal viável é **separar leitura de escrita (CQRS)**. Sem ela,
replicar o serviço não resolveria, porque todas as réplicas continuariam disputando o mesmo
banco transacional. Com a separação:

| | Command (escrita) | Query (leitura) |
|---|---|---|
| Volume | baixo e previsível | alto e em rajada |
| Instâncias | 2 a 4, fixas | 3 a 20, auto-scaling |
| Persistência | primário PostgreSQL | Redis + réplicas de leitura |
| Gatilho de escala | — | CPU > 60% ou latência p95 > 300 ms |

O caminho de leitura escala sozinho e o de escrita permanece estável, porque publicar notas
não fica mais frequente só porque mais alunos estão consultando.

### 3.2. Padrão de resiliência: Circuit Breaker com Fallback

O disjuntor protege a chamada da Grades API ao Messaging Service e ao serviço de
autenticação.

```
        falhas > 50% em 30 s
FECHADO ─────────────────────────► ABERTO
   ▲                                  │
   │  1 chamada de teste OK           │ após 60 s
   └────────── MEIO-ABERTO ◄──────────┘
```

- **Fechado:** tudo passa, com *timeout* de 2 s por chamada.
- **Aberto:** as chamadas falham imediatamente, sem consumir thread nem esperar. É isso que
  impede a falha em cascata — o serviço lento deixa de contaminar o chamador.
- **Meio-aberto:** após 60 s, uma chamada de teste decide se volta a fechar.

O **fallback** é o que torna o disjuntor aceitável do ponto de vista do negócio: com o
Messaging indisponível, a nota é gravada normalmente e o evento fica na fila para entrega
posterior. A notificação atrasa; a publicação não falha.

Complementam o desenho:

- **Retry com backoff exponencial e jitter**, apenas em operações idempotentes de leitura.
  O *jitter* evita o efeito manada — sem ele, mil clientes reconectam no mesmo instante e
  derrubam o serviço que acabou de voltar.
- **Bulkhead**: pools de conexão separados por dependência, para que o esgotamento causado
  por um subsistema não afete os demais.
- **Timeout em toda chamada de rede.** Uma chamada sem timeout é uma indisponibilidade
  esperando acontecer.

### 3.3. Serviços de nuvem

| Serviço | Uso | Problema que resolve |
|---|---|---|
| **CDN** | PDFs de histórico e boletim | Tira do servidor de origem o tráfego de arquivos imutáveis |
| **API Gateway** | Autenticação, *rate limit*, roteamento | Concentra política transversal; protege contra abuso |
| **Auto-scaling group** | Camada de Query | Acompanha o pico sem provisionar para ele o tempo todo |
| **Réplicas de leitura** | PostgreSQL | Distribui consulta sem sobrecarregar o primário |
| **Redis gerenciado** | Cache de média e situação | Elimina recálculo a cada requisição |
| **Fila gerenciada** | Evento `NotaPublicada` | Desacopla efeitos colaterais do caminho crítico |

## 4. Justificativa técnica por atributo de qualidade

**Desempenho.** O ganho principal não vem de mais máquinas, e sim de **não recalcular**. A
média e a situação passam a ser materializadas quando a nota muda, não quando alguém
consulta. Como a razão leitura/escrita é alta, o cálculo deixa de ocorrer por requisição e
passa a ocorrer por publicação.

**Escalabilidade.** A separação CQRS permite escalar o lado que cresce sem arrastar o que
não cresce. Isso é o oposto de escalar o monólito inteiro, onde a instância replicada
carrega também o código de escrita que ficará ocioso.

**Disponibilidade.** Disjuntor, *timeout* e *bulkhead* atacam o mesmo modo de falha: a
propagação. O objetivo declarado não é "nunca falhar", e sim **falhar de forma contida** —
degradar a notificação em vez de derrubar a publicação.

**Consistência — o trade-off assumido.** O desenho troca consistência forte por
**consistência eventual** na leitura. Entre a publicação e a atualização do cache existe
uma janela de segundos em que o aluno pode ver a nota anterior. Isso é aceitável para
consulta de notas e seria inaceitável para saldo bancário. Onde não é aceitável — a tela de
confirmação que o professor vê logo após publicar — a leitura é direcionada ao primário,
evitando que ele duvide do próprio envio.

**Custo.** O auto-scaling reduz o custo médio, mas o desenho acrescenta componentes (Redis,
fila, réplicas) que têm custo fixo e, sobretudo, **custo operacional**: mais peças para
monitorar e para falhar. É uma complexidade que só se justifica pela assimetria de carga
descrita na seção 2.

## 5. Conclusão

A decisão mais importante deste redesenho não é o auto-scaling nem o cache — é reconhecer
que **leitura e escrita de notas são cargas de naturezas diferentes** e parar de tratá-las
com a mesma arquitetura. Todas as outras escolhas decorrem disso: o CQRS separa, o cache
serve o lado que explode, a fila tira o efeito colateral do caminho crítico, e o disjuntor
garante que a falha de um vizinho não vire falha própria.

O princípio geral é o de sempre: escalabilidade raramente se resolve com mais hardware
sobre a mesma arquitetura. Resolve-se identificando qual dimensão realmente cresce e
isolando-a.

## 6. Referências

- Nygard, M. *Release It!* 2ª ed. Pragmatic Bookshelf — padrões Circuit Breaker, Bulkhead e Timeout.
- Microsoft. *Cloud Design Patterns — Circuit Breaker, Retry, CQRS*. <https://learn.microsoft.com/azure/architecture/patterns/>
- Fowler, M. *CQRS*. <https://martinfowler.com/bliki/CQRS.html>
- Fowler, M. *CircuitBreaker*. <https://martinfowler.com/bliki/CircuitBreaker.html>
- AWS. *Exponential Backoff and Jitter*. <https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/>
- Material da semana: Módulo 6 — Escalabilidade e resiliência.
