---
titulo: Tarefa 7 - Programação 6
atividade: Índices, Escalabilidade de Banco e Redis no Battle Tanks
---

## 1. Introdução

Esta análise aprofunda três frentes de desempenho de dados no capstone **Battle Tanks
Multiplayer**: tipos de índice no PostgreSQL, estratégias de escalabilidade
(particionamento e sharding) e o papel do Redis como cache.

O esquema de referência é o que existe na branch `LB-6` do projeto: `Jogador` (id, nome,
e-mail, jogos disputados, vitórias, pontuação total), `GameSession` (id, nome, jogadores
conectados, mapa, capacidade, status) e `Pontuacao` (id, playerId, pontos, data de
registro), mapeadas por `BattleTanksContext`.

---

## 2. Análise de índices e otimização de consultas

### 2.1. Tipos de índice e onde cada um se aplica

| Tipo | Como funciona | Uso no Battle Tanks |
|---|---|---|
| **B-tree** | Árvore balanceada, mantém ordem | Ranking por `PontuacaoTotal`, histórico por data, busca por e-mail |
| **Hash** | Tabela de dispersão, só igualdade | Busca por `PlayerId` — em teoria |
| **GIN** | Índice invertido, um item aponta para várias linhas | Busca em JSONB de configuração de partida, busca textual em chat |
| **GiST** | Árvore generalizada, dados com noção de proximidade | Consulta espacial: "quais tanques estão neste setor do mapa" |

**B-tree é o padrão, e quase sempre a resposta certa.** Ele atende igualdade, intervalo e
ordenação com a mesma estrutura, e é o único que permite ao planejador usar o índice para
*evitar o passo de ordenação*. Numa consulta como `ORDER BY PontuacaoTotal DESC LIMIT 10`,
o índice B-tree entrega as linhas já na ordem certa.

**Hash quase nunca compensa, e vale explicar por quê.** A intuição diz que uma busca por
igualdade deveria ser mais rápida num índice hash. Na prática, no PostgreSQL moderno, o
ganho sobre B-tree é marginal, e o hash tem duas desvantagens decisivas: não serve para
intervalo nem para ordenação, e não suporta índice de múltiplas colunas. Como a mesma coluna
frequentemente aparece em consultas de ordenação, manter um índice que só serve para
igualdade acaba exigindo um segundo índice B-tree ao lado. Conclusão para o projeto: **usar
B-tree mesmo nas buscas por `PlayerId`**.

**GIN e GiST resolvem problemas que o jogo ainda não tem.** Se as partidas passarem a
guardar configuração em coluna JSONB, GIN é o índice adequado para consultar dentro do JSON.
Se houver consulta espacial de posição no mapa, GiST é a estrutura para "tanques dentro
deste retângulo". Nenhum dos dois se justifica pelo esquema atual — e índice que não atende
consulta real é custo puro.

### 2.2. Índices parciais

Um índice parcial indexa apenas as linhas que satisfazem uma condição. É a ferramenta certa
quando a consulta frequente olha uma fatia pequena de uma tabela grande.

```sql
-- O lobby so consulta salas em espera. Salas finalizadas acumulam ao longo do
-- semestre e nunca aparecem nessa consulta - nao precisam estar no indice.
CREATE INDEX IX_GameSession_Waiting
    ON "GameSessions" ("Id")
    WHERE "Status" = 'waiting';
```

O ganho é duplo. O índice fica muito menor — proporcional às salas ativas, não ao histórico
acumulado — o que aumenta a chance de ele caber em memória. E a escrita fica mais barata:
inserir uma sala já finalizada não toca nesse índice.

A condição do índice precisa **coincidir com a da consulta** para o planejador conseguir
usá-lo. Um índice com `WHERE "Status" = 'waiting'` não é aproveitado por uma consulta que
filtra `WHERE "Status" <> 'finished'`, ainda que o conjunto resultante seja parecido.

### 2.3. Índices compostos

Índice composto vale quando a consulta filtra por uma coluna e ordena por outra:

```sql
CREATE INDEX IX_Pontuacao_Player_Data
    ON "Pontuacoes" ("PlayerId", "DataRegistro" DESC);
```

Isso atende diretamente "as últimas pontuações deste jogador". A **ordem das colunas é
decisiva**: um índice composto é aproveitado da esquerda para a direita. `(PlayerId,
DataRegistro)` serve para consultas que filtram por jogador, com ou sem a data; o inverso,
`(DataRegistro, PlayerId)`, não serve para filtrar só por jogador.

No contexto do capstone, um índice `(player_id, game_id)` se justificaria numa tabela que
registre participação por partida — consulta do tipo "o desempenho deste jogador nesta
partida", que é exatamente o padrão filtro-composto.

### 2.4. O custo dos índices na escrita

Este é o trade-off central e o mais fácil de esquecer. **Todo índice é uma estrutura
adicional que precisa ser atualizada a cada `INSERT`, `UPDATE` e `DELETE`.** Uma tabela com
cinco índices paga, em cada escrita, a atualização de cinco árvores além da própria linha.

No Battle Tanks isso importa concretamente: `PontuacaoTotal` do jogador é atualizada ao fim
de cada partida. Se essa coluna estiver indexada — e ela precisa estar, para o ranking — cada
atualização reposiciona a entrada na árvore. Com partidas simultâneas terminando em rajada,
esse custo aparece.

Duas mitigações se aplicam ao projeto:

- **Escrever menos vezes.** Acumular a pontuação no Redis durante a partida e persistir uma
  vez no fim, em vez de a cada evento.
- **Manter o ranking fora do PostgreSQL.** Um Sorted Set no Redis absorve a atualização
  frequente, e o banco guarda a verdade consolidada.

A regra prática: **índice acelera leitura e desacelera escrita**. Só se justifica quando a
razão leitura/escrita daquela coluna é alta — que é o caso do ranking, e não o caso de uma
coluna de log.

---

## 3. Particionamento vs sharding

### 3.1. A diferença

**Particionamento** divide uma tabela em pedaços **dentro do mesmo banco**. O PostgreSQL
apresenta uma tabela lógica única, e o planejador descarta partições que não podem conter o
resultado — *partition pruning*. É transparente para a aplicação.

**Sharding** distribui os dados por **instâncias diferentes**, em máquinas diferentes. Deixa
de ser transparente: a aplicação ou uma camada intermediária precisa saber em qual shard
está cada dado, e uma consulta que atravessa shards vira consulta distribuída.

```mermaid Figura 1 — Particionamento e sharding resolvem gargalos diferentes
flowchart TB
  subgraph PART["Particionamento — um servidor"]
    T["Pontuacoes<br/>(tabela logica)"]
    P1[("2026-Q1")]
    P2[("2026-Q2")]
    P3[("2026-Q3")]
    T --> P1
    T --> P2
    T --> P3
  end

  subgraph SHARD["Sharding — varios servidores"]
    R{{"Roteador<br/>por chave"}}
    S1[("Shard A<br/>servidor 1")]
    S2[("Shard B<br/>servidor 2")]
    S3[("Shard C<br/>servidor 3")]
    R --> S1
    R --> S2
    R --> S3
  end

  PART -.- NOTA1["resolve: tabela grande demais<br/>mantem: transacao e JOIN"]
  SHARD -.- NOTA2["resolve: um servidor nao aguenta<br/>custa: transacao distribuida"]

  classDef p fill:#dcfce7,stroke:#22c55e
  classDef s fill:#dbeafe,stroke:#3b82f6
  classDef n fill:#fef9c3,stroke:#eab308
  class PART p
  class SHARD s
  class NOTA1,NOTA2 n
```

### 3.2. Qual usar no Battle Tanks

**Particionamento, sem dúvida** — e sharding provavelmente nunca.

O problema real do jogo é a tabela `Pontuacoes` crescer indefinidamente, já que cada partida
gera registros que nunca são apagados. Isso é gargalo de **volume histórico**, não de
capacidade de servidor. Um jogo acadêmico com alguns milhares de jogadores não chega perto
de saturar uma instância PostgreSQL bem indexada.

Particionamento por intervalo de data resolve exatamente esse crescimento:

```sql
CREATE TABLE "Pontuacoes" (
    "Id"            bigserial,
    "PlayerId"      int          NOT NULL,
    "Pontos"        int          NOT NULL,
    "DataRegistro"  timestamptz  NOT NULL
) PARTITION BY RANGE ("DataRegistro");

CREATE TABLE "Pontuacoes_2026_q3" PARTITION OF "Pontuacoes"
    FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');

CREATE TABLE "Pontuacoes_2026_q4" PARTITION OF "Pontuacoes"
    FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');
```

Três ganhos concretos:

1. **Partition pruning.** Uma consulta com `WHERE "DataRegistro" >= '2026-07-01'` só
   examina a partição do trimestre. As demais nem são abertas.
2. **Manutenção barata.** Descartar dados antigos vira `DROP TABLE Pontuacoes_2026_q1` —
   instantâneo — em vez de um `DELETE` que varre milhões de linhas e gera *bloat*.
3. **Índices menores.** Cada partição tem seu índice, proporcional ao seu tamanho.

Uma armadilha a registrar: a chave de partição precisa fazer parte da chave primária. Isso
tem consequência no modelo do EF Core e é o tipo de detalhe que só aparece na migration.

### 3.3. Impacto do sharding na consistência do ranking

Se o sharding fosse adotado — por exemplo, jogadores distribuídos por faixa de id — o
ranking global seria o primeiro a quebrar. Ele exige ordenar **todos** os jogadores, e com
os dados espalhados isso significa consultar cada shard, trazer os resultados parciais e
mesclá-los na aplicação. Isso traz três problemas:

- **Consistência.** Os shards são consultados em instantes ligeiramente diferentes; o
  ranking resultante é uma foto de momentos distintos.
- **Latência.** A consulta demora o tempo do shard mais lento, não a média.
- **Correção da paginação.** "Página 2 do ranking" exige trazer as duas primeiras páginas de
  cada shard antes de saber quem realmente ocupa aquelas posições.

A solução usual é justamente **não fazer ranking global no banco compartilhado**, e sim
mantê-lo num Sorted Set do Redis, que é uma estrutura central e ordenada por natureza. Isso
reforça a conclusão: a resposta ao ranking não é sharding, é Redis.

### 3.4. Efeito na complexidade

| | Particionamento | Sharding |
|---|---|---|
| Transação atômica | preservada | distribuída, precisa de 2PC ou saga |
| JOIN entre tabelas | normal | entre shards, caro ou impossível |
| Impacto na aplicação | nenhum | roteamento explícito |
| Administração | criar partição periodicamente | rebalanceamento, backup por shard |
| Quando adotar | tabela grande demais | um servidor não aguenta mais |

---

## 4. Procedimentos armazenados e Redis

### 4.1. Quando usar procedimento armazenado

O critério é **onde os dados estão** e **quantas idas e voltas o cálculo exige**.

Procedimento armazenado compensa quando o cálculo percorre muitos registros e devolve pouco.
Calcular a pontuação final de uma partida — somar eventos, aplicar bônus, atualizar o total
do jogador — pode ser feito num único comando no servidor, em vez de trazer todos os eventos
pela rede para somá-los em C# e devolver o resultado.

```sql
CREATE OR REPLACE FUNCTION calcular_pontuacao_final(p_player_id int, p_desde timestamptz)
RETURNS int AS $$
DECLARE total int;
BEGIN
    SELECT COALESCE(SUM("Pontos"), 0) INTO total
    FROM "Pontuacoes"
    WHERE "PlayerId" = p_player_id AND "DataRegistro" >= p_desde;

    UPDATE "Jogadores" SET "PontuacaoTotal" = total WHERE "Id" = p_player_id;
    RETURN total;
END;
$$ LANGUAGE plpgsql;
```

O contra é sério e costuma pesar mais: lógica em procedimento **fica fora do controle de
versão do projeto**, não é coberta pelos testes em C#, não passa por revisão no merge
request, e amarra a aplicação ao PostgreSQL. Regra de negócio escondida no banco é a origem
clássica de comportamento que ninguém consegue explicar.

**Decisão para o Battle Tanks:** manter a regra de pontuação na aplicação, onde ela é
testável e versionada, e usar `ExecuteUpdateAsync` do EF Core para as atualizações em lote —
que gera um único comando SQL sem carregar entidades e sem tirar a lógica do repositório.
Procedimento armazenado ficaria reservado a rotinas de manutenção puramente de dados.

### 4.2. Redis como cache: efeito na latência

A diferença não é de percentual, é de ordem de grandeza. Uma consulta ao PostgreSQL envolve
conexão, análise da consulta, planejamento, execução e leitura de disco ou de cache do
banco. Uma leitura no Redis é acesso a uma estrutura em memória, pela rede.

No caso do ranking, o ganho aparece duas vezes: elimina o custo da consulta **e** elimina o
custo de **recalcular a ordenação a cada requisição**. Como o ranking é lido muito mais do
que muda, recalculá-lo por leitura é desperdício estrutural.

O ponto que merece atenção é a **política de invalidação**. TTL sozinho produz dado velho de
forma previsível; invalidação sozinha falha em silêncio quando alguém esquece de chamá-la. A
combinação — TTL curto como rede de segurança, invalidação explícita ao fim da partida — é o
que dá tanto atualidade quanto robustez.

### 4.3. Estrutura de dados do Redis por caso de uso

| Caso de uso | Estrutura | Por quê |
|---|---|---|
| Ranking global | **Sorted Set** | Mantém ordem por score; posição de um jogador em `O(log N)` |
| Sessão do jogador | **Hash** | Campos independentes atualizáveis sem reescrever o objeto |
| Últimos eventos da sala | **List** com `LTRIM` | Janela de tamanho fixo com custo constante |
| Paredes destruídas | **Hash** | Acesso por coordenada; idempotente por natureza |
| Cache de consulta | **String** com TTL | Objeto serializado inteiro, expiração automática |
| Contagem de jogadores online | **Set** | Unicidade automática, cardinalidade em `O(1)` |

O **Sorted Set** merece destaque porque resolve algo que o SQL faz mal. Responder "em que
posição eu estou no ranking?" com SQL exige contar quantos jogadores têm pontuação maior —
uma varredura. Com `ZREVRANK` é `O(log N)`:

```csharp
await _db.SortedSetAddAsync("ranking:zset", jogadorId.ToString(), pontuacaoTotal);
var posicao = await _db.SortedSetRankAsync("ranking:zset", jogadorId.ToString(), Order.Descending);
var top10   = await _db.SortedSetRangeByRankWithScoresAsync("ranking:zset", 0, 9, Order.Descending);
```

### 4.4. Otimizando consultas aninhadas

Consulta aninhada vira gargalo no ranking por dois motivos distintos, com soluções
diferentes.

**Subconsulta correlacionada.** Quando a subconsulta referencia a linha externa, o banco a
executa uma vez por linha. Trocar por `JOIN` ou por função de janela resolve:

```sql
-- Ruim: executa a subconsulta para cada jogador.
SELECT j."Nome",
       (SELECT SUM(p."Pontos") FROM "Pontuacoes" p WHERE p."PlayerId" = j."Id") AS total
FROM "Jogadores" j;

-- Melhor: uma passada, com agregacao agrupada.
SELECT j."Nome", COALESCE(SUM(p."Pontos"), 0) AS total
FROM "Jogadores" j
LEFT JOIN "Pontuacoes" p ON p."PlayerId" = j."Id"
GROUP BY j."Id", j."Nome"
ORDER BY total DESC;
```

**N+1 pelo ORM.** É o mesmo problema visto do lado do EF Core: uma consulta traz os
jogadores e, ao acessar a coleção de pontuações de cada um, dispara uma consulta por
jogador. A correção é carregar junto com `Include`, ou melhor, **projetar apenas o que a
tela precisa** com `Select`, que evita trazer entidades inteiras.

Para o ranking especificamente, a otimização definitiva não é melhorar a consulta e sim
**não fazê-la**: manter `PontuacaoTotal` materializada no `Jogador`, atualizada ao fim de
cada partida, e o ranking no Sorted Set. Consulta aninhada mais rápida continua sendo
consulta aninhada.

---

## 5. Conclusão

As três frentes convergem para o mesmo princípio: **desempenho de banco se resolve
evitando trabalho, não acelerando trabalho**. Índice evita varredura; particionamento evita
abrir dados irrelevantes; materialização evita recalcular; Redis evita ir ao banco.

Duas decisões ficam registradas para o capstone. A primeira é que o ranking **não pertence
ao PostgreSQL** no caminho de leitura — Sorted Set resolve ordenação e posição melhor do que
qualquer índice resolveria, e ainda absorve a escrita frequente. A segunda é que
particionamento por data é a estratégia de escalabilidade adequada ao problema real do jogo,
que é volume histórico, enquanto sharding resolveria um gargalo que o projeto não tem, ao
custo de quebrar exatamente a funcionalidade mais visível.

O passo seguinte é medir. Todo ganho descrito aqui é previsão fundamentada, e `EXPLAIN
ANALYZE` é o que a transforma em evidência.

## 6. Referências

- PostgreSQL. *Index Types*. <https://www.postgresql.org/docs/current/indexes-types.html>
- PostgreSQL. *Partial Indexes*. <https://www.postgresql.org/docs/current/indexes-partial.html>
- PostgreSQL. *Table Partitioning*. <https://www.postgresql.org/docs/current/ddl-partitioning.html>
- PostgreSQL. *Using EXPLAIN*. <https://www.postgresql.org/docs/current/using-explain.html>
- Redis. *Sorted Sets*. <https://redis.io/docs/latest/develop/data-types/sorted-sets/>
- Microsoft. *EF Core — ExecuteUpdate e ExecuteDelete*. <https://learn.microsoft.com/ef/core/saving/execute-insert-update-delete>
- Repositório do grupo, branch `LB-6` — esquema de referência.
