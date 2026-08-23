# Revisão — 7.2 Fórum de discussão e Resposta em pares (Arquitetura de Software 2, Semana 7)

**Veredito:** APROVADO COM RESSALVAS
**Revisado em:** 2026-08-23 12:39

## Cobertura do enunciado

| # | O que foi pedido | Situação | Onde está / o que falta |
|---|---|---|---|
| 1 | **P1** — Benefícios dos contextos delimitados em sistemas complexos | Atende | `post-forum.md:12-24`: o benefício central é a mesma palavra significar coisas diferentes sem virar bug, com o exemplo da palavra "nota" no Prometheus |
| 2 | **P1** — Influência na manutenibilidade | Atende | `post-forum.md:26-30`: fronteira boa é a que faz a mudança parar de se propagar, com o exemplo concreto da regra de arredondamento contida no contexto de Avaliação |
| 3 | **P1** — Influência na escalabilidade | Atende | `post-forum.md:32-37`: perfis de carga distintos entre consulta de nota e emissão de histórico, cada contexto escalando com a tecnologia adequada |
| 4 | **P2** — Aplicar DDD diante de requisitos ambíguos | Atende | `post-forum.md:46-75`: três movimentos — perseguir a palavra, tratar divergência de vocabulário como sinal, distribuir a incerteza conforme o tipo de domínio |
| 5 | **P2** — Garantir arquitetura sustentável e alinhada ao negócio | Atende | `post-forum.md:77-79`: o critério de sustentabilidade é a incerteza ficar confinada dentro de um contexto em vez de atravessar todos |
| 6 | Usar conceitos da semana: contextos delimitados, linguagem ubíqua, classificação de domínios | Atende | Os três aparecem e são usados, não apenas citados: bounded context em P1, linguagem ubíqua em `:50-55`, core contra supporting em `:64-69` |
| 7 | Responder a **dois** colegas | Atende | `post-forum.md:87-104`: Modelo A e Modelo B, um para cada pergunta do post |
| 8 | 2 a 3 frases para cada pergunta | Parcial | Cada modelo tem 4 frases. Está acima do pedido (ver problema 1) |
| 9 | Acrescentar comentário da própria pesquisa | Atende | Modelo A traz o critério de corte pelo vocabulário; Modelo B, a distinção core contra supporting |
| 10 | Pedir mais detalhes ao colega | Atende | Ambos terminam com pergunta direta |
| 11 | Limite mínimo de palavras | N/A | Este enunciado não fixa mínimo |
| 12 | Formato `discussion_topic`, texto para colar no Canvas | Atende | `entrega/post-forum.md`, sem `.docx` — correto para este tipo |
| 13 | Prazo (2026-08-24 02:59Z) | Atende | Ainda no prazo em 23/08 |

## Problemas encontrados

### 1. Os dois modelos de resposta passam do tamanho pedido — [MENOR]
- **Onde:** `entrega/post-forum.md:89-95` e `:99-104`
- **Problema:** o enunciado é explícito: "Responda a dois de seus colegas na discussão anterior com 2 a 3 frases para cada pergunta". O Modelo A tem 4 frases e o Modelo B também. Não é erro de conteúdo, e o excedente é bom texto, mas é desvio de uma instrução que o professor escreveu de forma quantitativa — o tipo de coisa que custa ponto de forma boba.
- **Correção:** no Modelo A, fundir a primeira frase com a segunda e cortar a explicação do caso Prometheus para uma oração subordinada. No Modelo B, cortar a terceira frase ("Essa distinção me ajudou a decidir onde investir tempo de análise"), que é comentário e não acrescenta argumento. Ambos ficam em 3 frases sem perder nada.

### 2. `AcademicRecordContext` classificado como supporting, mas o texto o descreve como crítico — [MENOR]
- **Onde:** `entrega/post-forum.md:16-18`, contra `../Lab Semana 07/entrega/relatorio.md:101-103`
- **Problema:** o post descreve o registro acadêmico como "um registro lacrado com valor legal, que não pode ser alterado", com trilha de auditoria — vocabulário de algo indispensável. No Lab da mesma semana, o mesmo `AcademicRecordContext` é classificado como *supporting*, enquanto `GradesContext` é *core*. As duas coisas convivem (valor legal alto não implica diferenciação estratégica, que é o critério de core), mas um colega pode legitimamente perguntar por que o contexto de maior consequência jurídica não é core. O post não antecipa essa pergunta.
- **Correção:** meia frase em `:23-24` deixando o critério explícito: "core não é o que dói mais quando falha, é o que diferencia a instituição; por isso Avaliação é core e Histórico, apesar do peso legal, é supporting". Isso demonstra domínio da classificação de domínios, que é justamente um dos conceitos da semana.

### 3. Modelo B fecha sugerindo a resposta da pergunta — [MENOR]
- **Onde:** `entrega/post-forum.md:103-104`
- **Problema:** "Vocês usaram alguma técnica de descoberta com os stakeholders, tipo Event Storming, ou foi mais por entrevista tradicional?" — ao oferecer as duas alternativas, a pergunta convida a um sim ou não. O enunciado pede que se peça mais detalhes sobre a pesquisa do colega, e pergunta fechada rende pouco detalhe.
- **Correção:** deixar aberta: "Como vocês fizeram a descoberta com os stakeholders, e o que apareceu nessa conversa que vocês não esperavam?"

### 4. Meta-instruções misturadas ao texto a ser colado — [MENOR]
- **Onde:** `entrega/post-forum.md:1-6`, `83-87`, `97`
- **Problema:** o arquivo mistura o texto do fórum com títulos de parte, a nota em blockquote sobre responder a dois colegas e os rótulos "Modelo A" e "Modelo B" com suas condições. Nada disso pode ir para o Canvas.
- **Correção:** colar apenas as duas respostas do post inicial e, depois de ler os colegas, postar cada modelo adaptado separadamente, sem os rótulos.

## Riscos de fabricação

**Nenhum.** Não há número, medição, saída de terminal, captura ou gráfico. Todo o texto é conceitual e argumentativo.

O que poderia ser invenção — o sistema Prometheus e seus contextos — é rastreável e consistente com o material do próprio aluno:

- Prometheus é o projeto arquitetônico do curso, com pasta própria em `entregas/Arquitetura de Software 2/Projeto - Exame Final-Projeto Arquitetônico Promethe/`.
- `GradesContext` e `AcademicRecordContext` aparecem nomeados em `entregas/Arquitetura de Software 2/Lab Semana 07/entrega/relatorio.md:101-103`, com a mesma classificação (core e supporting) e o mesmo argumento de separação (`relatorio.md:169`, "Lançamento em ata é fato consumado, assíncrono e auditável"). O exemplo da palavra "nota" com dois significados é o mesmo usado no Lab.
- Não há nenhuma afirmação sobre implementação, desempenho ou resultado de projeto que precise de lastro em código.

As afirmações conceituais foram conferidas e estão corretas:

- Bounded context permitindo que o mesmo termo tenha modelos distintos por contexto — correto, é a definição de Evans.
- Linguagem ubíqua como instrumento de investigação e não glossário posterior — leitura correta e madura do conceito.
- Divergência de vocabulário como evidência de fronteira de contexto — correto, e é exatamente o heurístico recomendado na literatura de DDD.
- Classificação core, supporting e generic orientando onde investir análise — correto.
- Event Storming como técnica de descoberta baseada em eventos de domínio, com os agrupamentos emergentes indicando contextos — correto, é a proposta de Alberto Brandolini.
- A ressalva de que bounded context tem custo (tradução entre modelos, consistência eventual, mais partes móveis) e não compensa em sistema pequeno — correta, e é o que separa uma resposta de quem entendeu de uma de quem decorou.

## Conclusão

Entrega madura e a mais bem argumentada das quatro de fórum: as duas perguntas estão respondidas em profundidade, os três conceitos da semana são usados e não apenas citados, e o exemplo do Prometheus é rastreável ao Lab da mesma semana. As duas respostas em pares exigidas estão preparadas. Antes de postar, cortar uma frase de cada modelo para caber nas "2 a 3 frases" que o enunciado pede, e limpar as marcações de rascunho.
