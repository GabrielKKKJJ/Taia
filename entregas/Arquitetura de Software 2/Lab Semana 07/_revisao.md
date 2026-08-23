# Revisão — Lab Semana 07 (A.7 Laboratório) — Arquitetura de Software 2

**Veredito:** APROVADO COM RESSALVAS
**Revisado em:** 2026-08-23 12:50 (UTC-3)

## Cobertura do enunciado

### Atividade #1 — Análise de requisitos de negócio

| # | O que foi pedido | Situação | Onde está / o que falta |
|---|---|---|---|
| 1 | Analisar o caso do Prometheus V2 (contexto, usuários, funcionalidades) | Atende | relatorio.md:20-28 — os cinco módulos do enunciado são citados e a postura de analista diante de informação incompleta está declarada |
| 2 | Pelo menos 5 requisitos funcionais | Atende | relatorio.md:34-40 — contados 7: FR1 a FR7 |
| 3 | Pelo menos 5 requisitos não funcionais | Atende | relatorio.md:41-47 — contados 7: NFR1 a NFR7 |
| 4 | Classificar os NFRs por categoria de qualidade | Atende | Todos os 7 têm categoria: Desempenho (NFR1 e NFR6), Disponibilidade, Segurança, Usabilidade, Manutenibilidade, Conformidade. Ressalva conceitual no problema 5 |
| 5 | Associar cada requisito a um ator | Atende | As 14 linhas têm ator preenchido; os FRs trazem travessão na coluna de qualidade, exatamente como o modelo do enunciado |
| 6 | Escrever duas regras de negócio claras e relevantes | Atende | relatorio.md:64-78 — RN1 (composição e arredondamento da média) e RN2 (imutabilidade do lançamento em ata), cada uma com explicação de por que é regra de negócio e não detalhe técnico |
| 7 | Apresentar a análise em tabela com as colunas ID, Tipo, Requerimento, Ator, Categoria | Atende | relatorio.md:32-47 — colunas idênticas às do enunciado |

### Atividade #2 — Domínios e contextos delimitados com DDD

| # | O que foi pedido | Situação | Onde está / o que falta |
|---|---|---|---|
| 8 | Estudar os cinco módulos funcionais listados | Atende | relatorio.md:86-95 cobre os cinco: usuários, qualificações, conteúdo, comunicação (fóruns e videoconferência) e acesso dos pais |
| 9 | Definir os domínios do sistema em core, supporting e generic | Atende | relatorio.md:86-95 — oito domínios, as três categorias representadas, cada uma com justificativa |
| 10 | Propor bounded contexts | Atende | relatorio.md:99-109 — nove contextos, incluindo os três do exemplo do enunciado (Grades, Users, Video) |
| 11 | Tabela DDD com Contexto, Tipo de domínio, Justificativa, Linguagem ubíqua | Atende | relatorio.md:99-109 — colunas idênticas às pedidas, linguagem ubíqua preenchida para todos |
| 12 | Diagrama de contexto com caixas ou cores diferentes por tipo e os contratos entre eles | Atende | relatorio.md:113-156, renderizado em entrega/assets/diagrama1.png e embutido no .docx (mesmo md5, conferido). Verificado na imagem: verde com borda grossa para core, azul para supporting, cinza tracejado para generic, amarelo para atores, e rótulo de contrato nas arestas entre contextos |
| 13 | Formato: upload de arquivo | Atende com ressalva | .docx gerado, cobrindo as duas atividades num só arquivo. O enunciado sugere nome único por atividade, no estilo "Atividade 1 - Semana 7"; arquivo único é aceitável, mas veja o problema 1 |
| 14 | Prazo 23/08/2026 23:59 UTC-3 | Em aberto | Vence hoje; ainda dentro do prazo no momento da revisão |

## Problemas encontrados

### 1. Os títulos "Atividade #1" e "Atividade #2" não existem no .docx entregue — [IMPORTANTE]
- **Onde:** entrega/Lab Semana 07 - Arquitetura de Software 2.docx (fonte correta em entrega/relatorio.md:18 e :82)
- **Problema:** a palavra "Atividade" aparece zero vezes no documento gerado — conferido por busca no XML do .docx. O texto salta de "1. Introdução" para "2.1. Contexto assumido" e, mais adiante, para "3.1. Classificação dos domínios". O lab é composto por duas atividades avaliadas, e o arquivo que o Faculty Practitioner vai abrir não nomeia nenhuma das duas; o leitor precisa inferir pelo conteúdo e pela numeração. A causa é reprodutível: o gerador descarta toda H2 seguida imediatamente por uma H3 — o mesmo defeito aparece na Tarefa Semana 06.
- **Correção:** regerar o .docx corrigindo o conversor, ou inserir uma frase de abertura entre cada título de atividade e o primeiro subtítulo. Sem isso, a ressalva de formato do item 13 vira um risco real de perder ponto por estrutura.

### 2. O Conformist está desenhado na direção oposta à do resto do mapa — [IMPORTANTE]
- **Onde:** relatorio.md:144-146 (arestas) contra relatorio.md:170-171 (tabela de contratos)
- **Problema:** no mesmo diagrama convivem duas semânticas de seta. Em IdentityService para UsersContext (OHS) e UsersContext para Grades, Forum e Guardian (upstream), a seta vai do upstream para o downstream. Já ContentContext para VideoService e GradesContext para NotificationService estão desenhadas como fluxo, mas a tabela as classifica como Conformist — padrão em que quem se submete é o downstream. Pela convenção usada nas outras arestas, o diagrama afirma que ContentContext é upstream do VideoService, o contrário do que o texto diz ("serviço externo dita o contrato").
- **Correção:** marcar U e D em cada aresta, como Vernon faz nos mapas de contexto, ou distinguir visualmente relação de modelo de fluxo de evento.

### 3. Existe uma relação no diagrama que não aparece na tabela de contratos — [MENOR]
- **Onde:** relatorio.md:144 (ContentContext com ACL para ForumContext) contra a tabela de relatorio.md:164-171
- **Problema:** a tabela 3.4 lista seis relações; o diagrama tem sete. A aresta ContentContext para ForumContext, rotulada ACL, não é justificada em lugar nenhum — e é a única do mapa sem explicação, num trabalho cuja tese é que toda fronteira precisa de justificativa de negócio.
- **Correção:** acrescentar a linha na tabela ou remover a aresta.

### 4. "Cada seta traz o tipo de contrato" não é verdade para todas as setas — [MENOR]
- **Onde:** relatorio.md:158-160
- **Problema:** as arestas dos atores (Professor para Grades, Aluno para Forum, Responsável para Guardian, Secretaria para Record) estão sem rótulo. A afirmação vale para as relações entre contextos, não para o diagrama inteiro.
- **Correção:** ajustar a frase para "cada relação entre contextos traz o tipo de contrato".

### 5. As categorias de qualidade não batem com a ISO/IEC 25010 citada nas referências — [MENOR]
- **Onde:** relatorio.md:41-47 e a referência em relatorio.md:212
- **Problema:** as categorias usadas (Desempenho, Disponibilidade, Segurança, Usabilidade, Manutenibilidade, Conformidade) seguem o enunciado, o que está certo. Mas o documento cita a ISO/IEC 25010 como fonte, e nela Disponibilidade é subcaracterística de Confiabilidade, e Conformidade deixou de ser característica própria na passagem do 9126 para o 25010. Citar a norma e usar categorias que não são as dela é o tipo de imprecisão que um avaliador criterioso aponta.
- **Correção:** ou mapear as categorias às oito características do 25010 numa frase, ou retirar a citação normativa e dizer que a classificação segue o enunciado.

### 6. A justificativa da ACL entre Grades e Guardian descreve responsabilidade do upstream — [MENOR]
- **Onde:** relatorio.md:168
- **Problema:** "O responsável vê nota consolidada, nunca rascunho em correção. A ACL filtra e traduz". A Anticorruption Layer é camada defensiva do downstream, que traduz o modelo alheio para o seu. Decidir o que é exposto — nota consolidada sim, rascunho não — é contrato do upstream, papel típico de um Open Host Service. A ACL do Guardian entra depois, traduzindo o que recebe.
- **Correção:** separar as duas coisas em uma frase: Grades publica apenas nota consolidada via contrato de saída; Guardian mantém ACL para não herdar o modelo de Grades.

### 7. "Event-driven" listado como padrão de mapa de contexto — [MENOR]
- **Onde:** relatorio.md:169
- **Problema:** o catálogo de context mapping (Evans, Vernon) é Partnership, Shared Kernel, Customer/Supplier, Conformist, Anticorruption Layer, Open Host Service, Published Language, Separate Ways e Big Ball of Mud. Event-driven é estilo de integração, não relação entre contextos.
- **Correção:** classificar a relação Grades para AcademicRecord como Customer/Supplier ou Published Language e dizer que a integração é por eventos. O argumento escrito já está correto; é só o rótulo.

### 8. Trechos quase idênticos aos de outra entrega da mesma semana — [IMPORTANTE]
- **Onde:** relatorio.md:173-182 comparado com Tarefa Semana 07 - 7.4 Tarefas/entrega/relatorio.md:72-89
- **Problema:** a seção 3.5 deste lab e a seção 4.1 da tarefa 7.4 dizem a mesma coisa com quase as mesmas palavras, incluindo a frase "o sintoma clássico de fronteira mal traçada". A conclusão também ecoa o post do fórum 7.2. São três entregas do mesmo curso, na mesma semana, com o mesmo prazo. É natural que a modelagem seja a mesma; repetir a redação é o que chama atenção.
- **Correção:** manter a mesma decisão de fronteira, mas reescrever o argumento aqui com o recorte do lab — que é a ligação com a RN2 da atividade 1, algo que a tarefa 7.4 não tem. Esse encadeamento já é o diferencial do documento; basta explorá-lo em vez de repetir o texto.

## Riscos de fabricação

Nenhum. Nada a rotular como FABRICADO.

- Os valores dos NFRs (menos de 2 s no p95, 99,5% de disponibilidade, 3 cliques, vídeo em menos de 3 s a 5 Mbps) estão redigidos como metas — "devem estar", "deve manter" —, que é a forma correta de um requisito. Nenhum é apresentado como medição do sistema.
- A premissa aberta sobre acesso dos pais após a maioridade está declarada como premissa em relatorio.md:59-62, com indicação de que precisa ser validada com a coordenação. Marcador honesto, não é erro.
- O marcador [PENDENTE] sobre reproduzir o diagrama em Lucidchart, Miro ou Draw.io foi extraído para _pendencias.md e não vaza no .docx — conferido: a palavra PENDENTE não aparece no documento gerado.
- O diagrama do .docx é byte a byte igual a entrega/assets/diagrama1.png, gerado da fonte mermaid do relatório.

Ponto de atenção sem gravidade: a RN1 fixa cortes específicos (média 7,0 para aprovação, 4,0 para recuperação, arredondamento em uma casa) como se fossem dados do caso. O enunciado pede que o aluno escreva as regras, então isso é a tarefa e não invenção de resultado; ainda assim, marcá-la como regra proposta ficaria coerente com a postura de premissas declaradas do resto do documento.

## Consistência com a Tarefa 7.4 (mesmo sistema, mesma semana)

Conferido item a item, porque os dois documentos modelam o Prometheus V2 com DDD:

- **Sem contradição na fronteira central.** Grades core e AcademicRecord supporting aqui; Avaliação core e Registro Acadêmico supporting lá. Mesma decisão, mesma justificativa de fundo.
- **Sem contradição em conteúdo e notificação.** Conteúdo é core nos dois; Notificação é generic nos dois.
- **Divergência real, pequena:** aqui Role vive no UsersContext, classificado supporting, e o IdentityService generic fica com User, Session e Claim. Na tarefa 7.4, o contexto Identidade é generic e sua linguagem ubíqua inclui Papel e Permissão. Autorização acaba classificada supporting num documento e generic no outro.
- **Divergência de nomenclatura:** nomes em inglês aqui (GradesContext, ContentContext, UsersContext), em português lá (Avaliação, Conteúdo, Matrícula). Aqui está correto seguir o enunciado, que usa GradesContext e UsersContext no exemplo; vale só ter consciência de que quem ler as duas entregas vê nomes diferentes para as mesmas fronteiras.
- **Escopo diferente, sem conflito:** o lab tem GuardianContext e VideoService porque o enunciado lista acesso dos pais e videoconferência; a tarefa 7.4 tem Aprendizagem porque recortou outro conjunto. Nenhum dos dois nega o outro.

## Conclusão

As duas atividades estão completas e os mínimos numéricos foram conferidos por contagem: 7 requisitos funcionais e 7 não funcionais, acima dos 5 exigidos, todos com ator, todos os NFRs com categoria, mais as duas regras de negócio. O diagrama atende à exigência de cores por tipo de domínio e traz os contratos. O que precisa mudar antes do upload é o .docx: sem os títulos "Atividade #1" e "Atividade #2", o arquivo entregue não identifica as duas entregas que o lab pede. Os ajustes conceituais — direção do Conformist, a aresta Content para Forum sem justificativa, o rótulo Event-driven — são pequenos e rápidos, mas são exatamente o que um Faculty Practitioner de DDD verifica.
