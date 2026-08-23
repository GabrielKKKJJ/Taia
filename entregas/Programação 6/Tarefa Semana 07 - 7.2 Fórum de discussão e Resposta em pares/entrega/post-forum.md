# 7.2 Fórum — Programação 6 (Semana 7)

> Formato de entrega: `discussion_topic`. Cole o texto direto no fórum do Canvas.
> O enunciado avisa: publique primeiro a sua resposta inicial; só depois você vê as dos colegas.
> A resposta ao colega deve ter 2 ou 3 frases e **pedir mais detalhes** sobre a pesquisa dele.

---

## PARTE 1 — Post inicial

### Discussão 1 — Índices e otimização de consultas no PostgreSQL

**Que tipos de índice para cada cenário.**
Para busca de jogador por id ou por e-mail, e para o ranking global, o índice adequado é
**B-tree** nos dois casos. Isso costuma surpreender, porque a intuição manda usar **Hash**
para busca por igualdade. Na prática o ganho do hash sobre o B-tree é marginal no PostgreSQL
moderno, e ele tem duas limitações que pesam: não serve para intervalo nem para ordenação, e
não aceita múltiplas colunas. Como a mesma coluna costuma aparecer também em ordenação,
acabaríamos mantendo dois índices onde um B-tree resolveria.

**GIN** e **GiST** só entrariam se o modelo mudasse: GIN para consultar dentro de uma coluna
JSONB de configuração de partida ou para busca textual no chat; GiST para consulta espacial
do tipo "quais tanques estão neste setor do mapa". Com o esquema atual do Battle Tanks,
nenhum dos dois se justifica.

**Índices parciais.**
São a ferramenta certa quando a consulta frequente olha uma fatia pequena de uma tabela
grande. O lobby só lista salas com status `waiting`, mas a tabela acumula salas finalizadas
o semestre inteiro:

```sql
CREATE INDEX IX_GameSession_Waiting ON "GameSessions" ("Id")
    WHERE "Status" = 'waiting';
```

O índice fica proporcional às salas ativas e não ao histórico, o que aumenta a chance de
caber em memória, e inserir uma sala já finalizada não toca nele. O detalhe que pega é que a
condição do índice precisa **coincidir** com a da consulta — um índice com
`WHERE status = 'waiting'` não é usado por uma consulta que filtra `WHERE status <>
'finished'`, mesmo que o resultado seja parecido.

**Índices e velocidade de escrita.**
Aqui está o trade-off que se esquece com mais facilidade. Todo índice é uma estrutura extra
que precisa ser atualizada em cada `INSERT`, `UPDATE` e `DELETE`. No nosso projeto isso é
concreto: `PontuacaoTotal` é atualizada ao fim de cada partida e precisa estar indexada para
o ranking — então cada atualização reposiciona a entrada na árvore. Com várias partidas
terminando ao mesmo tempo, o custo aparece.

Duas saídas que estamos considerando: acumular a pontuação no Redis durante a partida e
gravar uma vez só no fim, e manter o ranking num Sorted Set em vez de recalculá-lo no banco.
A regra geral é que índice só compensa onde a razão leitura/escrita é alta.

**Índices compostos no capstone.**
Um índice `(PlayerId, DataRegistro)` na tabela de pontuações atende diretamente "as últimas
pontuações deste jogador", porque o banco usa o mesmo índice para filtrar **e** ordenar,
eliminando o passo de sort. A ordem das colunas é decisiva: índice composto é aproveitado da
esquerda para a direita, então `(PlayerId, DataRegistro)` serve para filtrar só por jogador,
mas `(DataRegistro, PlayerId)` não. Um índice `(player_id, game_id)` se justificaria numa
tabela de participação por partida — mesmo padrão de filtro composto.

### Discussão 2 — Estratégias de escalabilidade em bancos de dados

**Particionamento ou sharding.**
Para o Battle Tanks, **particionamento**, e sharding provavelmente nunca. Os dois resolvem
problemas diferentes: particionamento ataca "a tabela ficou grande demais", sharding ataca
"um servidor não aguenta mais". O nosso problema é o primeiro — a tabela de pontuações cresce
indefinidamente — e não o segundo, porque alguns milhares de jogadores não saturam uma
instância PostgreSQL bem indexada.

Particionamento por intervalo de data resolve com três ganhos: *partition pruning*, em que
uma consulta por período só abre a partição relevante; manutenção barata, porque descartar
dados antigos vira `DROP TABLE` instantâneo em vez de um `DELETE` que varre milhões de
linhas; e índices menores, um por partição. E é transparente para a aplicação, ao contrário
do sharding.

Vale notar o efeito colateral do sharding sobre o **ranking global**: com os jogadores
espalhados por instâncias, ordenar todos exigiria consultar cada shard e mesclar os
resultados, o que quebra a consistência (cada shard responde num instante diferente) e torna
a paginação incorreta. A resposta ao ranking não é sharding — é Redis.

**Procedimentos armazenados.**
Compensam quando o cálculo percorre muitos registros e devolve pouco, evitando trazer tudo
pela rede. Calcular pontuação final somando eventos é um candidato razoável.

Mas o contra pesa bastante: lógica em procedimento fica **fora do controle de versão**, não
é coberta pelos testes em C#, não passa por revisão no merge request e amarra o projeto ao
PostgreSQL. Regra de negócio escondida no banco é a origem clássica daquele comportamento
que ninguém consegue explicar. No nosso caso, preferimos manter a regra na aplicação e usar
`ExecuteUpdateAsync` do EF Core para atualizações em lote — gera um único comando SQL sem
carregar entidades, e sem tirar a lógica do repositório.

**Redis frente a consultar o PostgreSQL direto.**
A diferença não é percentual, é de ordem de grandeza: consultar o banco envolve conexão,
análise, planejamento, execução e leitura; ler do Redis é acesso a memória pela rede. No
ranking o ganho aparece duas vezes, porque além de evitar a consulta evita **recalcular a
ordenação** a cada requisição — e o ranking é lido muito mais do que muda.

O cuidado necessário é a política de invalidação. TTL sozinho produz dado velho; invalidação
sozinha falha em silêncio quando alguém esquece de chamá-la. Usar os dois — TTL curto como
rede de segurança e invalidação explícita ao fim da partida — é o que dá atualidade e
robustez ao mesmo tempo.

**Consultas aninhadas.**
Dois problemas diferentes com soluções diferentes. A **subconsulta correlacionada** executa
uma vez por linha da consulta externa; trocar por `JOIN` com `GROUP BY` ou por função de
janela resolve. O **N+1 do ORM** é o mesmo problema visto do lado do EF Core, e se corrige
com `Include` ou, melhor, projetando com `Select` apenas o que a tela precisa.

Para o ranking, porém, a otimização definitiva não é melhorar a consulta e sim **não
fazê-la**: manter `PontuacaoTotal` materializada no jogador e o ranking num Sorted Set.
Consulta aninhada mais rápida continua sendo consulta aninhada.

---

## PARTE 2 — Resposta a um colega

> 2 ou 3 frases, com um detalhe adicional e um pedido de mais informação. Escolha um modelo.

**Modelo A — se o colega defendeu índice Hash para busca por id:**

Boa observação sobre o hash ser conceitualmente mais direto para igualdade. O que me fez
mudar de ideia pesquisando foi descobrir que, no PostgreSQL moderno, o ganho sobre B-tree é
marginal, e o hash não serve para ordenação nem aceita múltiplas colunas — então acabamos
mantendo dois índices onde um B-tree resolveria os dois casos. Você chegou a comparar os
planos de execução com `EXPLAIN ANALYZE` nos dois tipos, ou foi pela documentação?

**Modelo B — se o colega falou de sharding:**

Concordo que o sharding é a saída quando um servidor deixa de dar conta, mas no caso do
Battle Tanks o gargalo me parece ser volume histórico e não capacidade — e aí o
particionamento por data resolve sem quebrar transação nem JOIN. O que me convenceu foi
perceber que o ranking global fica muito mais difícil com dados espalhados, porque ordenar
todo mundo exige mesclar resultados de cada shard. Como você trataria o ranking num cenário
com sharding?

**Modelo C — se o colega falou de Redis:**

Gostei do ponto sobre latência, e acrescentaria que no ranking o ganho é duplo, porque além
de evitar a ida ao banco evita recalcular a ordenação a cada leitura — e o Sorted Set ainda
responde "qual a minha posição" em `O(log N)`, coisa que no SQL exigiria contar quantos
estão acima. Na sua pesquisa, você viu alguma estratégia de invalidação além de TTL, para o
caso de o cache precisar refletir a mudança na hora?
