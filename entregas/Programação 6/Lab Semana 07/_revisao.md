# Revisão — A.7 Laboratório Semana 7 (Programação 6)

**Veredito:** REPROVADO
**Revisado em:** 2026-08-23 13:13 (UTC-3) — 2ª rodada

> 1ª rodada: REPROVADO (3 bloqueantes). O bloqueante 1 — Atividade #3 ausente — está **fechado**.
> Seguem abertos os bloqueantes 2 (nenhuma medição, onde a rubrica exige medição) e 3 (nada aplicado
> no repositório). Dois problemas IMPORTANTES da 1ª rodada também foram fechados.

## Cobertura — Atividade #3 (foco desta rodada)

| # | O que foi pedido | Situação | Onde está / o que falta |
|---|---|---|---|
| 14 | Sharding, por exemplo partidas por região | Atende | §5.1: chave de fragmentação por região do jogador, o que fica fácil (consultas dentro do shard) e o que quebra (ranking global, resolvido por Sorted Set central no Redis). Inclui a ressalva honesta de que o Battle Tanks não precisa de sharding hoje |
| 15 | Réplicas de leitura com replicação em streaming | Atende | §5.2: `postgresql.conf` do primário, `pg_basebackup` na réplica, `BattleTanksReadContext` com string de conexão separada e o trade-off de lag |
| 16 | Connection pooling com Npgsql | Atende | §5.3: string de conexão com pool dimensionado, tabela justificando cada parâmetro e o alerta sobre estourar `max_connections` |
| 17 | Diagramas de sharding e replicação | Atende | Figura 2 (Mermaid: roteador, shards BR/US/EU e Redis) e o esquema primário/réplicas em §5.2 |
| 18 | Benchmark de carga com mais de 100 jogadores | N/A | Marcado como **opcional** no enunciado; §5.4 declara a decisão de deixar fora e registra o caminho (k6 ou JMeter). Não conta como falha |
| 19 | Gráficos de carga contra tempo de resposta | Não atende (derivado do opcional) | Só existe com o benchmark; consequência declarada em §5.4 |

### Conferência das citações de configuração

- **Npgsql:** `Minimum Pool Size`, `Maximum Pool Size`, `Connection Idle Lifetime`, `Timeout`,
  `Command Timeout` e `Max Auto Prepare` são todos parâmetros reais da connection string do Npgsql, e
  a descrição de cada um na tabela está correta (inclusive `Connection Idle Lifetime` em segundos e
  `Max Auto Prepare` como número de comandos preparados automaticamente). O raciocínio de dimensionar
  `Maximum Pool Size` abaixo de `max_connections` dividido pelo número de instâncias está certo, e a
  indicação do PgBouncer para o passo seguinte também.
- **`postgresql.conf`:** `wal_level = replica`, `max_wal_senders = 4` e `wal_keep_size = 512MB` estão
  corretos para o primário. `hot_standby = on` é parâmetro da standby, não do primário (é ignorado lá,
  e o padrão já é `on` desde a versão 10) — ver problema 3.
- **EF Core:** `UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking)` existe e é a forma correta
  de fixar o comportamento no contexto. Registrar dois `DbContext` com strings distintas é válido.
- **Novidades das outras atividades:** §4.6 (Set de jogadores online com `SetAddAsync`,
  `SetRemoveAsync` e `SetLengthAsync`, ligado a `GameHub.JoinRoom`, `LeaveRoom` e
  `OnDisconnectedAsync`) e §4.7 (denylist de JWT em `jwt:revogado:{jti}` com TTL igual ao tempo
  restante do token) fecham os problemas 6 e 7 da 1ª rodada. As assinaturas usadas existem em
  StackExchange.Redis.
- **`.docx` regerado às 13:11:** os três títulos de atividade agora aparecem no documento
  ("Atividade #1 — Otimização de consultas...", "Atividade #2 — Integração Redis...",
  "Atividade #3 — Design do banco para escalabilidade"). Problema 4 da 1ª rodada fechado.

Demais itens: 1 a 3 Atende; 4 Parcial (Bulk Extensions trocado sem justificar); 5 a 7 Não atende;
8 agora Atende (§4.6); 9 Atende; 10 agora Atende (§4.7); 11 a 13 como antes; 20 Parcial; 21 agora
Atende; 22 a 26 Atende.

## Problemas encontrados

### 1. Nenhuma medição, em atividades cuja rubrica exige medição — [BLOQUEANTE] (pendente da 1ª rodada)
- **Onde:** `entrega/relatorio.md:528-543` (§6), `_pendencias.md`
- **Problema:** a instrução 4 da Atividade #1 é explícita e não é opcional: "meça os tempos de
  consulta antes e depois de aplicar índices" e "compare `ToList()` vs `AsNoTracking()`". A rubrica da
  Atividade #2 também tem linha de Benchmarking. O relatório continua entregando apenas a tabela "Como
  validar os ganhos" e dois marcadores `[PENDENTE]`; a comparação `ToList()` contra `AsNoTracking()`
  segue sem ser mencionada. O próprio texto assume: "Todo ganho descrito aqui é previsão fundamentada".
  Honesto, e ainda assim é o requisito não cumprido. (O benchmark de carga da Atividade #3 é outro
  item, esse sim opcional, e ficar fora está correto.)
- **Correção:** o mínimo viável antes de enviar: seed de algumas dezenas de milhares de linhas em
  `Pontuacoes`, `EXPLAIN ANALYZE` da consulta de salas antes e depois do índice, e um laço com
  `Stopwatch` comparando a mesma consulta que retorna entidade com e sem `AsNoTracking()`.

### 2. Nada aplicado no repositório — [BLOQUEANTE] (pendente da 1ª rodada)
- **Onde:** repositório `capstone`, branches remotas (reconferido nesta rodada)
- **Problema:** o primeiro entregável das três atividades é "arquivos modificados ou atualizados
  adicionados ao gitlab". Continua não existindo branch `LB-7/*` — a mais recente é `origin/LB-6`
  (HEAD em `2473c57`). Os índices de §3.1, o `RankingCacheService` de §4.2, o Set de §4.6, a denylist
  de §4.7 e o `BattleTanksReadContext` de §5.2 existem apenas dentro do relatório. Sem a migration, os
  índices não existem no banco.
- **Correção:** criar `LB-7/otimizacao-db-redis`, aplicar `OnModelCreating`, gerar
  `dotnet ef migrations add AddPerformanceIndexes`, aplicar `AsNoTracking()` em `RoomEndpoints.cs` e
  commitar na convenção `LB-7#N. descrição`.

### 3. `hot_standby` listado como configuração do primário — [MENOR] (novo)
- **Onde:** `entrega/relatorio.md:454-461`
- **Problema:** o bloco é apresentado como "Configuração no primário (`postgresql.conf`)" e inclui
  `hot_standby = on`, que só tem efeito quando o servidor está em recuperação, isto é, na réplica (e
  já é o padrão). Não causa erro, mas descreve a topologia de forma imprecisa para quem reproduzir.
- **Correção:** separar em dois blocos, primário e standby, ou anotar que `hot_standby` vale do lado
  da réplica.

### 4. Efeito do `NoTracking` na réplica está exagerado — [MENOR] (novo)
- **Onde:** `entrega/relatorio.md:477-480`
- **Problema:** "`NoTracking` fixado no contexto de leitura ... Torna impossível salvar por engano
  através da réplica". `QueryTrackingBehavior.NoTracking` afeta apenas entidades vindas de consulta;
  um `Add` explícito seguido de `SaveChanges` continua sendo enviado. Quem impede a escrita é a
  réplica ser somente leitura — o que o próprio parágrafo diz na frase seguinte.
- **Correção:** trocar "impossível" por "reduz drasticamente o risco", mantendo a réplica como a
  barreira real.

### 5. Pendências da 1ª rodada que seguem abertas — [registro]
- Bulk Operations com `ExecuteUpdate`/`ExecuteDelete` em vez de `EFCore.BulkExtensions`, sem
  justificar a troca nem seu limite (não fazem insert em massa) — IMPORTANTE.
- Um único `relatorio.md` no lugar de `Lab07-activity{1,2,3}-studentName.md` — Parcial.
- Fallback para SQLite em `Program.cs`, que inviabiliza o `EXPLAIN ANALYZE` sem PostgreSQL no ar e é
  pré-requisito também da Atividade #3 (réplicas e pooling só existem no Postgres) — MENOR.
- `RankingCacheService` sem construtor de injeção — MENOR.
- Os marcadores `[PENDENTE]` do §6 não aparecem no `.docx` entregue (`_pendencias.md` registra o
  comportamento). O efeito aqui é menor que no lab de IoT, porque o texto não afirma ter medido nada.

## Riscos de fabricação

**Nenhum.** Não há um único número apresentado como medido — nem tempo de consulta, nem taxa de
acerto de cache, nem latência sob carga. As citações de configuração da Atividade #3 foram conferidas
parâmetro a parâmetro (Npgsql e `postgresql.conf`) e são reais, com a imprecisão de `hot_standby`
anotada acima. As afirmações sobre o código do capstone continuam batendo com `origin/LB-6`, como na
1ª rodada.

## Conclusão

A Atividade #3 fecha o bloqueante que faltava e está bem escrita: sharding com consequência declarada,
réplicas com trade-off de lag, pooling com parâmetros corretos e diagrama. Somados a isso, o Set de
jogadores online, a denylist de JWT e os títulos de atividade recuperados no `.docx` fecham três
problemas anteriores. O que ainda reprova é o que sobrou da 1ª rodada: nenhuma medição, onde a rubrica
de duas atividades pede medição, e nenhuma linha aplicada no repositório — sem branch `LB-7`, todo o
laboratório permanece no plano do texto.

Prazo: hoje, 23/08/2026 às 23:59 (UTC-3).
