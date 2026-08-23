# Revisão — A.7 Laboratório Semana 7 (Programação 6)

**Veredito:** REPROVADO
**Revisado em:** 2026-08-23 12:39

## Cobertura do enunciado

| # | O que foi pedido | Situação | Onde está / o que falta |
|---|---|---|---|
| 1 | **Ativ.1** — Criar índices em tabelas-chave | Atende | `relatorio.md` §3.1: três índices novos (`IX_GameSession_Status`, `IX_Pontuacao_Player_Data`, `IX_Jogador_PontuacaoTotal_Desc`), cada um justificado por uma consulta real |
| 2 | **Ativ.1** — Otimizar consultas de alto tráfego com `AsNoTracking()` | Atende | §3.2, inclusive a nuance correta de que projeção via `Select` para DTO já não rastreia |
| 3 | **Ativ.1** — Paginação | Atende | §3.3, com `Math.Clamp` no tamanho e `ThenBy(Id)` para ordenação total |
| 4 | **Ativ.1** — Bulk Operations com "EF Core Bulk Extensions" | Parcial | §3.4 usa `ExecuteUpdateAsync`/`ExecuteDeleteAsync` (EF Core nativo 7+), não a biblioteca citada no enunciado. Substituição defensável, mas não justificada no texto |
| 5 | **Ativ.1** — Benchmarking: medir antes/depois dos índices | Não atende | Apenas o comando `EXPLAIN ANALYZE` sugerido em §3.1 e marcador `[PENDENTE]` em §5. Nenhuma medição |
| 6 | **Ativ.1** — Comparar `ToList()` vs `AsNoTracking()` | Não atende | Não há medição nem menção a essa comparação em lugar nenhum do relatório |
| 7 | **Ativ.1** — Capturas de tela dos índices e tempos | Não atende | `[PENDENTE]` em §5; `entrega/assets/` só tem `diagrama1.png` (o Mermaid da Figura 1) |
| 8 | **Ativ.2** — Armazenar jogadores conectados via `GameHub.cs` | Não atende | §4 trata de cache de ranking e de sessão; não há proposta de Set de jogadores online ligada ao `GameHub` |
| 9 | **Ativ.2** — Cache do ranking global (top 10) | Atende | §4.2 (cache-aside String+TTL) e §4.3 (Sorted Set). Boa discussão de TTL somado a invalidação |
| 10 | **Ativ.2** — Sessão: guardar JWT expirado no Redis e validar sem tocar no PostgreSQL | Parcial | §4.4 modela `sessao:{id}` como Hash com TTL, mas não implementa a denylist de JWT revogado, que é o que o enunciado pede literalmente |
| 11 | **Ativ.2** — Diagrama do Redis (estrutura de chaves) | Parcial | §4.5 traz tabela de chaves/estruturas/expiração. Não há diagrama, mas a tabela cobre o conteúdo |
| 12 | **Ativ.2** — Comparação PostgreSQL vs Redis em operações frequentes | Parcial | Argumento qualitativo em §4.3 (`O(log N)` contra varredura). Sem comparação medida |
| 13 | **Ativ.2** — Uso correto de Sets, SortedSets, Hashes | Parcial | SortedSet e Hash usados corretamente; Set (`SADD`) não aparece, e é a estrutura natural do item 8 |
| 14 | **Ativ.3** — Sharding (ex.: partidas por região) | Não atende | Ausente. Busca por "shard" no relatório não retorna nada |
| 15 | **Ativ.3** — Réplicas de leitura / streaming replication | Não atende | Ausente |
| 16 | **Ativ.3** — Connection pooling com Npgsql | Não atende | Ausente |
| 17 | **Ativ.3** — Diagramas de sharding e replicação | Não atende | Ausente |
| 18 | **Ativ.3** — Benchmark de carga com mais de 100 jogadores | N/A | Marcado como opcional no enunciado. Não conta como falha |
| 19 | Entregável: arquivos modificados no GitLab | Não atende | Não existe branch `LB-7/*` no repositório; a mais recente é `origin/LB-6`. Tudo no relatório é proposta, nenhuma linha aplicada |
| 20 | Entregável: relatórios `Lab07-activity{1,2,3}-studentName.md` | Parcial | Entregue um único `relatorio.md` mais `.docx`, cobrindo só as atividades 1 e 2. O repositório já usa a convenção `Lab05-activityN-Nome.md` em `docs/` |
| 21 | Documento com títulos claros por atividade | Parcial | O `.md` tem os títulos, mas o `.docx` perdeu os cabeçalhos "3. Atividade #1" e "4. Atividade #2" (ver problema 4) |
| 22 | Explicações de dois a três parágrafos por atividade | Atende (no escopo entregue) | §3 e §4 |
| 23 | Referências bibliográficas | Atende | §7, seis fontes primárias (Microsoft Learn, PostgreSQL, Redis) |
| 24 | Conclusões sobre o progresso do capstone | Atende | §6 |
| 25 | Formato `online_upload` com `.docx` gerado | Atende | `entrega/Lab Semana 07 - Programação 6.docx` (capa, Figura 1 renderizada, cerca de 14,4 mil caracteres) |
| 26 | Prazo (2026-08-24 02:59Z) | Atende | Ainda no prazo em 23/08 |

## Problemas encontrados

### 1. Atividade #3 inteiramente ausente — [BLOQUEANTE]
- **Onde:** `entrega/relatorio.md` (documento inteiro)
- **Problema:** o enunciado tem três atividades. O relatório vai da Atividade #2 (§4) direto para "Como validar os ganhos" (§5) e conclusões (§6). Não há uma linha sobre sharding, réplicas de leitura, connection pooling ou os diagramas correspondentes — busca por "shard", "réplica", "pooling" e "Npgsql" no relatório não retorna nenhuma ocorrência. É um terço da nota (a rubrica da Atividade 3 tem quatro linhas) simplesmente não entregue.
- **Correção:** acrescentar uma seção "Atividade #3 — Design de banco de dados para escalabilidade" com: (a) critério de sharding aplicável ao BattleTanks, por exemplo `GameSessions` particionada por região ou data, com `Jogador` permanecendo global; (b) topologia primário/réplica e quais consultas iriam para a réplica (ranking, histórico), com a ressalva de lag de replicação; (c) configuração de pool no Npgsql (`Minimum Pool Size`, `Maximum Pool Size`, `Timeout` na connection string de `appsettings.json`); (d) diagrama Mermaid de sharding e replicação. O item 4 (benchmark de carga) é opcional e pode ficar de fora.

### 2. Nenhuma medição, em atividades cuja rubrica exige medição — [BLOQUEANTE]
- **Onde:** `entrega/relatorio.md:340-355` (§5) e `_pendencias.md`
- **Problema:** "Benchmarking" é linha de rubrica na Atividade #1 e também na Atividade #2. O enunciado pede explicitamente "meça os tempos de consulta antes e depois de aplicar índices" e "compare ToList() vs AsNoTracking()". O relatório entrega apenas uma tabela de como medir e dois marcadores `[PENDENTE]`. A comparação `ToList()` contra `AsNoTracking()` sequer é mencionada. O próprio texto assume: "Todo ganho descrito aqui é previsão fundamentada". Honesto, e ainda assim é o requisito não cumprido.
- **Correção:** rodar o mínimo viável antes de enviar: seed de umas 50 mil linhas em `Pontuacoes`, `EXPLAIN ANALYZE` da consulta de salas antes e depois do índice, e um laço com `Stopwatch` comparando a mesma consulta com e sem `AsNoTracking()` retornando entidade. O repositório já tem `scripts/benchmarks/benchmark.js` como precedente de medição real. Três números reais valem mais que cinco páginas de previsão.

### 3. Nada aplicado no repositório — [BLOQUEANTE]
- **Onde:** repositório `capstone`, branches remotas
- **Problema:** os três entregáveis do enunciado começam por "arquivos modificados ou atualizados adicionados ao gitlab". Não existe branch `LB-7/*`; a mais recente é `origin/LB-6`. Os índices de §3.1, o `RankingCacheService` de §4.2 e o código de sessão de §4.4 existem apenas dentro do relatório. Sem a migration `AddPerformanceIndexes`, nem os índices existem no banco.
- **Correção:** criar `LB-7/otimizacao-db-redis`, aplicar as mudanças de `OnModelCreating`, gerar a migration, aplicar o `AsNoTracking()` em `RoomEndpoints.cs` e commitar seguindo a convenção `LB-7#N. descrição` recomendada no enunciado.

### 4. O `.docx` perdeu os títulos "Atividade #1" e "Atividade #2" — [IMPORTANTE]
- **Onde:** `entrega/Lab Semana 07 - Programação 6.docx`
- **Problema:** no `.md` existem `## 3. Atividade #1 — Otimização de consultas com PostgreSQL e EF Core` (linha 63) e `## 4. Atividade #2 — Uso avançado do Redis` (linha 228). No `.docx` a sequência de títulos é: "2. Diagnóstico do estado atual", "3.1. Criação de índices", ..., "3.4. Operações em massa", "4.1. O que o Redis já faz". Os dois cabeçalhos de nível 2 sumiram, provavelmente engolidos pela regra horizontal `---` que os precede no Markdown. O enunciado pede "títulos claros por atividade", e é justamente por esse título que o avaliador procura ao pontuar cada rubrica.
- **Correção:** remover os `---` que precedem esses dois cabeçalhos, ou inserir linha em branco entre a regra e o cabeçalho, e regerar o `.docx`. Conferir depois se os três títulos de atividade aparecem no documento.

### 5. "EF Core Bulk Extensions" trocado sem justificar — [IMPORTANTE]
- **Onde:** `entrega/relatorio.md:201-224` (§3.4)
- **Problema:** o enunciado nomeia "EF Core Bulk Extensions" (a biblioteca `EFCore.BulkExtensions`, com `BulkInsertAsync` e `BulkUpdateAsync`). A entrega usa `ExecuteUpdateAsync` e `ExecuteDeleteAsync`, que são API nativa do EF Core e cobrem update e delete em massa, mas não cobrem insert em massa, que é o caso de uso principal da biblioteca. A troca é tecnicamente sensata (o projeto está em EF Core 8.0.2, confirmado em `backend.csproj`), só que o relatório não diz que está trocando nem por quê.
- **Correção:** um parágrafo explicitando a decisão e o limite dela: a API nativa evita dependência externa e cobre update e delete; para inserção em massa de `Pontuacao` a biblioteca continuaria sendo a escolha, porque `ExecuteUpdate` e `ExecuteDelete` não fazem insert.

### 6. Item "jogadores conectados no GameHub" não endereçado — [IMPORTANTE]
- **Onde:** `entrega/relatorio.md` §4 (ausência)
- **Problema:** a instrução 1 da Atividade #2 é "armazenamento de jogadores conectados, em GameHub.cs (SignalR)". O relatório não trata disso. É pena, porque é o item mais fácil de casar com o código existente: `GameHub.JoinRoom` e `LeaveRoom` (verificados na branch) são exatamente os pontos de entrada, e é onde entraria `SetAddAsync`/`SetRemoveAsync` — a única das três estruturas cobradas pela rubrica (Sets, SortedSets, Hashes) que a entrega não usa.
- **Correção:** subseção curta em §4: `SADD online:room:{id} {playerId}` em `JoinRoom`, `SREM` em `LeaveRoom`, `SCARD` para contagem, com a ressalva de que uma queda de conexão sem `LeaveRoom` exige `OnDisconnectedAsync` para não deixar lixo no Set.

### 7. Denylist de JWT não modelada — [IMPORTANTE]
- **Onde:** `entrega/relatorio.md:303-326` (§4.4)
- **Problema:** o enunciado pede "armazenando tokens JWT expirados no Redis" e "verifique a validade da sessão sem consultar o PostgreSQL". A §4.4 modela uma sessão genérica com Hash e TTL, o que é correto, mas não é a mesma coisa: falta a chave de revogação (`jwt:denylist:{jti}`) com TTL igual ao tempo restante do token, e o ponto de verificação no pipeline de autenticação.
- **Correção:** acrescentar `StringSetAsync($"jwt:denylist:{jti}", "1", tempoRestante)` no logout e a checagem no evento `OnTokenValidated` do `AddJwtBearer`, que já existe em `Program.cs` na branch LB-6.

### 8. O projeto cai para SQLite quando não há PostgreSQL — [MENOR]
- **Onde:** `entrega/relatorio.md` (todo o §3) contra `backend/Program.cs` da branch `LB-6`
- **Problema:** o relatório raciocina exclusivamente sobre PostgreSQL (`Seq Scan`, `EXPLAIN ANALYZE`, `psql`). O `Program.cs` real tenta abrir uma `NpgsqlConnection` e, se falhar, usa `options.UseSqlite("Data Source=battletanks.db")`. Existe inclusive a migration `20260816015015_InitialSqlite`. Quem for reproduzir o `EXPLAIN ANALYZE` num ambiente sem Postgres no ar não verá nada do que o relatório descreve.
- **Correção:** uma frase em §3 registrando o fallback e que as medições precisam do PostgreSQL efetivamente ativo — o que também é pré-requisito para a Atividade #3, já que réplicas e pooling só existem no Postgres.

### 9. `RankingCacheService` sem construtor — [MENOR]
- **Onde:** `entrega/relatorio.md:242-272`
- **Problema:** a classe declara `private readonly IDatabase _db;` e `private readonly BattleTanksContext _ctx;` e nenhum construtor os inicializa. Como snippet ilustrativo passa, mas se for copiado para a solução gera aviso de campo não atribuído e o serviço não pode ser registrado no DI.
- **Correção:** incluir o construtor de injeção, ou marcar explicitamente o bloco como recorte parcial.

## Riscos de fabricação

**Nenhum.** Esta é a parte mais sólida da entrega, e foi conferida nome por nome contra `origin/LB-6`:

- `BattleTanksContext` com `DbSet<Jogador>`, `DbSet<GameSession>` e `DbSet<Pontuacao>` — confere (`backend/Data/BattleTanksContext.cs`).
- "O `OnModelCreating` atual declara apenas dois índices, ambos de unicidade em `Jogador`" (§2) — confere exatamente: `Email` e `Nome`, ambos `IsUnique()`.
- Campos citados de `GameSession` (`Id`, `Nome`, `JogadoresConectados`, `MapaSelecionado`, `CapacidadeMaxima`, `Status`) — todos existem, com os mesmos nomes.
- Campos citados de `Jogador` (`Id`, `Nome`, `PontuacaoTotal`, `Vitorias`, `JogosDisputados`) — todos existem.
- Campos citados de `Pontuacao` (`PlayerId`, `DataRegistro`) — ambos existem; `DataRegistro` é `DateTime`, compatível com o filtro de §3.4.
- A consulta de salas reproduzida em §3.1 é literalmente a de `backend/Endpoints/RoomEndpoints.cs` (`group.MapGet("/")`, `Where(r => r.Status == "waiting")`, projeção para `RoomDto`, `ToListAsync()`) — confere, inclusive a ausência de `AsNoTracking()`, que é a premissa da §3.2.
- "`RedisStateService` guarda paredes destruídas num hash e os últimos 100 eventos numa lista, com LPUSH mais LTRIM" (§4.1) — confere: `HashSetAsync` em `room:{roomId}:walls`, `ListLeftPushAsync` seguido de `ListTrimAsync(key, 0, 99)` em `room:{roomId}:events`.
- Chaves `room:{id}:walls` e `room:{id}:events` da tabela §4.5, marcadas como "já existe" — corretas.

APIs verificadas quanto a existência e uso correto: `AsNoTracking`, `ExecuteUpdateAsync(s => s.SetProperty(...))`, `ExecuteDeleteAsync` e `HasIndex(...).IsDescending()` são todas válidas em EF Core 8 (`backend.csproj` fixa 8.0.2, e essas APIs existem a partir do EF Core 7). `SortedSetAddAsync(key, member, score)`, `SortedSetRangeByRankWithScoresAsync(key, 0, 9, Order.Descending)`, `SortedSetRankAsync(key, member, Order.Descending)`, `HashSetAsync(key, HashEntry[])`, `KeyExpireAsync(key, TimeSpan)` e `StringSetAsync(key, value, ttl)` existem em StackExchange.Redis com essas assinaturas (o projeto usa 3.1.13).

Não há um único número apresentado como medido no relatório. Os dois marcadores `[PENDENTE]` são honestos e não contam como defeito.

## Conclusão

A parte escrita é boa e, o que é raro, integralmente verdadeira: cada entidade, campo, índice e consulta citada foi conferida contra `origin/LB-6` e bate. O problema é de cobertura, não de honestidade — falta a Atividade #3 inteira, falta qualquer medição em atividades cuja rubrica pede medição, e nada foi aplicado no repositório. Como está, quatro linhas de rubrica caem em "Não implementado" e outras duas em "Nenhuma medição". Antes de enviar: escrever a Atividade #3, rodar o `EXPLAIN ANALYZE` e o comparativo `ToList()` contra `AsNoTracking()` com números reais, abrir a branch `LB-7` com o código, e regerar o `.docx` conferindo se os títulos de atividade sobreviveram.
