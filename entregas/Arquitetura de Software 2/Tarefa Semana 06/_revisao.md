# Revisão — Tarefa Semana 06 (6.4 Tarefas) — Arquitetura de Software 2

**Veredito:** APROVADO COM RESSALVAS
**Revisado em:** 2026-08-23 12:45 (UTC-3)

## Cobertura do enunciado

| # | O que foi pedido | Situação | Onde está / o que falta |
|---|---|---|---|
| 1 | Selecionar um módulo do Prometheus V2 com desafios de carga/disponibilidade | Atende | relatorio.md:12 — Grades API, com três critérios de escolha declarados |
| 2 | Descrever as limitações atuais de escalabilidade/resiliência | Atende | relatorio.md:30-53 — quatro limitações (carga concentrada, leitura/escrita no mesmo caminho, acoplamento síncrono, falha sem contenção). Ressalva: o título "2. Análise do componente atual" sumiu no .docx (problema 1) |
| 3 | Uma estratégia de escalonamento (horizontal, vertical ou diagonal) | Atende | relatorio.md:101-120 — horizontal, com justificativa explícita de por que não vertical |
| 4 | Um padrão de resiliência (Circuit Breaker, Retry, Fallback, etc.) | Atende | relatorio.md:122-152 — Circuit Breaker com máquina de estados, Fallback, Retry com backoff e jitter, Bulkhead, Timeout. Termos empregados com o significado correto (Nygard, Fowler) |
| 5 | Uso de ferramentas ou serviços cloud (CDN, replicação, auto-scaling) | Atende | relatorio.md:154-163 — tabela com CDN, API Gateway, auto-scaling group, réplicas de leitura, Redis gerenciado e fila gerenciada |
| 6 | Justificativa técnica considerando disponibilidade, latência, throughput e tolerância a falhas | Parcial | relatorio.md:165-190 cobre desempenho, escalabilidade, disponibilidade, consistência e custo. Throughput não é mencionado em nenhum ponto do documento; latência aparece só como gatilho de auto-scaling (linha 117); tolerância a falhas não é nomeada, embora o conteúdo esteja no parágrafo de disponibilidade |
| 7 | Um ou mais diagramas | Atende | Figura 1 (relatorio.md:57-99), renderizada em entrega/assets/diagrama1.png e embutida no .docx — conferido, mesmo md5. Há também a máquina de estados do disjuntor, preservada no .docx |
| 8 | Reflexão final sobre trade-offs | Atende | relatorio.md:180-190 (consistência eventual, custo operacional) e 192-202 |
| 9 | Estrutura recomendada: título e dados do estudante | Atende | Capa do .docx com título, atividade e "Aluno: Djordan Gabriel Bezerra Moura" |
| 10 | Formato DOCX, 2 a 4 páginas | Parcial | .docx gerado corretamente, com as 2 tabelas e o diagrama. A extensão estimada (cerca de 8.900 caracteres de corpo, mais capa e figura de largura total) fica acima da faixa sugerida |
| 11 | Prazo 23/08/2026 23:59 UTC-3 | Em aberto | Vence hoje; ainda dentro do prazo no momento da revisão |

## Problemas encontrados

### 1. O título "2. Análise do componente atual" não existe no .docx entregue — [IMPORTANTE]
- **Onde:** entrega/Tarefa Semana 06 - Arquitetura de Software 2.docx (fonte correta em entrega/relatorio.md:22)
- **Problema:** o texto do .docx salta de "1. Escopo e premissas" direto para "2.1. O que a Grades API faz". A palavra "componente" aparece apenas duas vezes no documento, ambas no corpo da seção 1. O padrão é reprodutível: toda H2 seguida imediatamente por uma H3 é descartada pelo gerador — o mesmo acontece no Lab Semana 07. Como o enunciado lista "Análise do componente" na estrutura recomendada e a rubrica pontua "Estrutura do documento", o avaliador procura esse título e não encontra, e a numeração fica quebrada: 1 depois 2.1.
- **Correção:** regerar o .docx corrigindo o conversor, ou inserir uma frase de abertura entre a H2 e a H3 no relatorio.md para forçar a emissão do título.

### 2. O Circuit Breaker sobre o Messaging Service contradiz o próprio diagrama — [IMPORTANTE]
- **Onde:** relatorio.md:124 e 140-142, contra o diagrama em relatorio.md:85-87
- **Problema:** o desenho proposto integra a Grades API ao Messaging por fila: Command publica evento, fila entrega ao Messaging. Se não há chamada síncrona, não existe chamada a ser protegida por disjuntor, e o fallback descrito — a nota é gravada e o evento fica na fila — é consequência do assincronismo, não do Circuit Breaker. O texto justifica o padrão pelo problema que o próprio redesenho já eliminou.
- **Correção:** posicionar o disjuntor onde de fato há chamada síncrona (serviço de autenticação e, se for o caso, a publicação na fila) e tratar o modo de falha real do caminho de eventos — broker indisponível no momento do commit, que pede Transactional Outbox e retry no consumidor. Separar em uma frase o que o disjuntor protege do que o assincronismo já desacoplou.

### 3. Métricas nomeadas pelo enunciado sem tratamento explícito — [IMPORTANTE]
- **Onde:** relatorio.md:165-190, seção 4
- **Problema:** o enunciado pede justificativa considerando disponibilidade, latência, throughput e tolerância a falhas. Throughput não aparece; latência aparece apenas como gatilho de escala; tolerância a falhas não é nomeada.
- **Correção:** estender os parágrafos da seção 4 usando os quatro termos do enunciado — ligar throughput à capacidade agregada do grupo de auto-scaling e latência ao p95 alvo já citado na tabela de 3.1.

### 4. Número solto na seção de análise — [MENOR]
- **Onde:** relatorio.md:34-35, "fica ociosa 95% do tempo"
- **Problema:** o documento é rigoroso ao marcar o cenário de carga como premissa, mas esse valor aparece sem a mesma marcação e sem derivação. Num texto que se sustenta na honestidade das premissas, um número não rastreável enfraquece o resto.
- **Correção:** derivar do cenário assumido ou trocar por formulação qualitativa.

### 5. O pico assumido embute uma conta não explicitada — [MENOR]
- **Onde:** relatorio.md:37-38
- **Problema:** 400 req/s por 10 minutos equivalem a 240.000 requisições, cerca de 30 consultas por aluno na janela, para os 8.000 alunos declarados. É premissa agressiva e defensável, mas o leitor precisa refazer a conta para avaliá-la.
- **Correção:** acrescentar a conta em uma linha, o que reforça que o número é dimensionamento e não medição.

### 6. Espaços múltiplos herdados da quebra de linha do markdown — [MENOR]
- **Onde:** .docx, item de lista sobre jitter: "no mesmo instante e   derrubam"
- **Problema:** a quebra de linha do fonte virou espaço triplo no documento final.
- **Correção:** normalizar espaços em branco na conversão.

### 7. Vocabulário da semana parcialmente aproveitado — [MENOR]
- **Onde:** documento inteiro
- **Problema:** a semana 6 lista "sem estado + com estado" e "balanceamento de carga" entre os tópicos. O balanceador aparece no diagrama, mas a condição de statelessness — que é o que torna o escalonamento horizontal possível — nunca é mencionada. CQRS, por sua vez, não está na lista de tópicos da semana, embora esteja no catálogo Microsoft Cloud Design Patterns, que é leitura obrigatória, portanto está ao alcance.
- **Correção:** uma frase em 3.1 dizendo que as instâncias de Query são sem estado e por isso replicáveis atrás do balanceador conecta a proposta ao conteúdo da semana.

### 8. Divergência com as entregas de DDD da mesma semana — [MENOR]
- **Onde:** relatorio.md:26, "emissão de histórico" dentro da Grades API
- **Problema:** a Tarefa 7.4 e o Lab 7 separam o histórico oficial num contexto próprio, Registro Acadêmico. Aqui o histórico segue dentro da Grades API, inclusive no CDN. Não é erro, já que esta seção descreve o componente atual, mas quem ler as três entregas pode ler como incoerência.
- **Correção:** uma nota dizendo que a separação do registro acadêmico é tratada na modelagem de domínios da semana 7.

## Riscos de fabricação

Nenhum dado apresentado como medição real — nada a rotular como FABRICADO.

- O cenário de carga é declarado premissa duas vezes: relatorio.md:17-20 e o marcador "Cenário assumido:" na linha 37. Ambas as declarações sobreviveram no .docx, conferido no texto extraído do documento gerado.
- Os valores de configuração (timeout de 2 s, 50% de falhas em 30 s, 60 s de espera, CPU acima de 60%, p95 de 300 ms, 2 a 4 e 3 a 20 instâncias) são parâmetros de projeto propostos, não resultados observados, e o texto os apresenta assim.
- A seção 4 é inteiramente qualitativa: não afirma ganho percentual, latência medida nem disponibilidade alcançada. É o comportamento correto para um documento sem ambiente de teste.
- O diagrama do .docx é byte a byte igual a entrega/assets/diagrama1.png, portanto rastreável à fonte mermaid do relatório.

Único ponto de atenção, sem gravidade: o "ociosa 95% do tempo" do problema 4, que é retórico e não medido.

## Conclusão

O conteúdo técnico é sólido e a terminologia está correta: CQRS, Circuit Breaker com os três estados, Bulkhead como isolamento de pools, backoff exponencial com jitter contra efeito manada, e consistência eventual com leitura no primário para o caso de read-your-writes. Dá para entregar hoje, mas antes vale corrigir dois pontos: regerar o .docx com o título da seção 2 e resolver a contradição entre o disjuntor sobre o Messaging e a integração por fila do próprio diagrama — é o único lugar onde um avaliador atento pode apontar erro conceitual. Nomear throughput, latência e tolerância a falhas na seção 4 custa três frases e fecha a cobertura literal do enunciado.
