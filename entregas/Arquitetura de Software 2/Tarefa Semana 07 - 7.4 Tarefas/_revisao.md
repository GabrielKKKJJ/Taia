# Revisão — Tarefa Semana 07 (7.4 Tarefas) — Arquitetura de Software 2

**Veredito:** APROVADO COM RESSALVAS
**Revisado em:** 2026-08-23 12:47 (UTC-3)

## Cobertura do enunciado

| # | O que foi pedido | Situação | Onde está / o que falta |
|---|---|---|---|
| 1 | Stakeholders relevantes e seus requisitos principais | Atende | relatorio.md:18-25 — seis stakeholders (aluno, professor, coordenação, secretaria, TI, instituição), cada um com expectativa e requisito principal |
| 2 | Classificação de domínios em core, supporting e generic | Atende | relatorio.md:46-54 — sete domínios, as três categorias representadas, critério de classificação declarado antes da tabela (valor competitivo) |
| 3 | Proposta de contextos delimitados com justificativa | Atende | relatorio.md:62-70 (sete contextos, responsabilidade e linguagem ubíqua) e 72-96 (duas fronteiras justificadas em profundidade) |
| 4 | Mapa de contexto visual com atores e relações entre contextos | Atende | relatorio.md:100-141, renderizado em entrega/assets/diagrama1.png e embutido no .docx — conferido, mesmo md5. Quatro atores presentes, arestas rotuladas com o padrão de relacionamento |
| 5 | Elemento mínimo: tabela de domínios classificados | Atende | Seção 3 |
| 6 | Elemento mínimo: mapa de contexto | Atende | Seção 5 |
| 7 | Elemento mínimo: breve explicação de cada contexto delimitado | Atende | Tabela da seção 4 cobre os sete contextos; 4.1 e 4.2 aprofundam dois |
| 8 | Elemento mínimo: justificativa das decisões | Atende | Seções 4.1, 4.2 e 5.1 |
| 9 | Direção: coerência entre modelo de domínio e proposta arquitetônica | Parcial | Não há mapeamento explícito entre a tabela de domínios (seção 3) e a de contextos (seção 4). "Relatórios e BI" é classificado como domínio e depois desaparece: não vira contexto nem aparece no mapa. "Registro Acadêmico" é o inverso — existe como contexto e no mapa, mas não tem linha na tabela de domínios |
| 10 | Direção: justificar decisões com base em princípios de DDD | Atende | Padrões de relacionamento nomeados e justificados em 5.1, com ressalva conceitual no problema 1 |
| 11 | Formato: relatório técnico em PDF, 2 a 3 páginas | Parcial | Foi gerado .docx, não PDF; a extensão estimada (cerca de 9.300 caracteres de corpo, quatro tabelas, capa e mapa de largura total) fica bem acima de 2 a 3 páginas |
| 12 | Prazo 23/08/2026 23:59 UTC-3 | Em aberto | Vence hoje; ainda dentro do prazo no momento da revisão |

## Problemas encontrados

### 1. O mapa mistura duas semânticas de seta, e o Conformist fica invertido — [IMPORTANTE]
- **Onde:** relatorio.md:124-131 (arestas do mapa) contra relatorio.md:145-151 (tabela de padrões)
- **Problema:** nas arestas Identidade para Matrícula (OHS/PL), Matrícula para Avaliação (upstream) e Conteúdo para Aprendizagem (ACL), a seta significa upstream aponta para downstream. Já em Avaliação para Notificação e Comunicação para Notificação a seta significa fluxo de evento — e a tabela classifica essas relações como Conformist, padrão em que o contexto local é o downstream que se submete ao modelo do upstream. Ou seja: na convenção usada no resto do diagrama, a seta do Conformist deveria apontar de Notificação para Avaliação. Um leitor que conheça o catálogo de Evans e Vernon lê o mapa como se Avaliação fosse upstream de Notificação, o que contradiz a justificativa escrita ("o sistema se adapta ao contrato dele").
- **Correção:** marcar cada aresta com U e D, como faz Vernon, ou separar visualmente as relações de modelo (OHS, ACL, Customer/Supplier, Conformist) das de fluxo de evento. Não custa nada e elimina a ambiguidade.

### 2. Seção 6 fora do escopo desta tarefa e atribuída ao enunciado errado — [IMPORTANTE]
- **Onde:** relatorio.md:157-176
- **Problema:** a seção abre com "O enunciado da semana levanta a questão de como usar DDD quando o stakeholder não sabe dizer o que quer". O enunciado da 7.4 não levanta essa questão em nenhum ponto — ela é a pergunta 2 do fórum 7.2 ("Quando se enfrentam requisitos ambíguos ou mal definidos por parte dos stakeholders..."). Além da atribuição incorreta, o conteúdo repete o post do fórum já preparado em Tarefa Semana 07 - 7.2 Fórum.../entrega/post-forum.md: mesma estrutura de três movimentos, mesmos exemplos e frase de fecho praticamente idêntica ("a incerteza fique confinada dentro de um contexto"). Duas entregas da mesma semana, do mesmo curso, com o mesmo texto.
- **Correção:** remover a seção 6 desta tarefa — ela não é pedida e é parte do excesso de extensão — ou, se quiser mantê-la, reescrever com outro recorte e apagar a atribuição ao enunciado.

### 3. Tabela de domínios e tabela de contextos não se conversam — [IMPORTANTE]
- **Onde:** relatorio.md:46-54 e relatorio.md:62-70
- **Problema:** o enunciado avalia explicitamente "a coerência entre modelo de domínio e proposta arquitetônica". São sete domínios e sete contextos, mas sem correspondência declarada. "Relatórios e BI" é classificado como supporting e some do desenho; "Registro Acadêmico" aparece no mapa como supporting sem nunca ter sido classificado na tabela de domínios; "Avaliação e Aprendizagem" é um domínio único que vira dois contextos, o que é correto em DDD mas não está dito.
- **Correção:** acrescentar uma coluna "contexto(s) correspondente(s)" na tabela da seção 3, ou uma frase explicando que um domínio pode se desdobrar em mais de um contexto e que Relatórios e BI ficou fora do recorte.

### 4. Formato pedido é PDF de 2 a 3 páginas — [IMPORTANTE]
- **Onde:** entrega/Tarefa Semana 07 - Arquitetura de Software 2.docx
- **Problema:** o enunciado é específico: opção 1 é relatório técnico em PDF com 2 a 3 páginas. Foi entregue .docx com extensão estimada em torno do dobro. Diferente da Tarefa 6, aqui o enunciado não oferece DOCX como alternativa.
- **Correção:** exportar para PDF e enxugar — remover a seção 6 já resolve boa parte do excesso.

### 5. "Event-driven" listado como padrão de mapa de contexto — [MENOR]
- **Onde:** relatorio.md:150
- **Problema:** o catálogo de context mapping de Evans e Vernon é Partnership, Shared Kernel, Customer/Supplier, Conformist, Anticorruption Layer, Open Host Service, Published Language, Separate Ways e Big Ball of Mud. "Event-driven" é estilo de integração, não relação entre contextos. Numa tabela em que todas as outras linhas trazem padrões canônicos, a mistura chama atenção.
- **Correção:** classificar a relação Avaliação para Registro como Customer/Supplier ou Published Language, e dizer que a integração se dá por eventos. A justificativa escrita já está certa; é só o rótulo.

### 6. Rótulos sobrepostos na renderização do mapa — [MENOR]
- **Onde:** entrega/assets/diagrama1.png, região central
- **Problema:** os rótulos "upstream" (Matrícula para Aprendizagem) e "ACL: recurso publicado" (Conteúdo para Aprendizagem) se sobrepõem na imagem gerada, e o primeiro fica cortado. O mapa é elemento obrigatório e pontuado; legibilidade conta.
- **Correção:** encurtar os rótulos ou reorganizar o layout do mermaid até a renderização não colidir.

### 7. Divergências com o Lab da mesma semana — [MENOR]
- **Onde:** relatorio.md:52 e 70, comparados com Lab Semana 07/entrega/relatorio.md:90-108
- **Problema:** os dois documentos modelam o mesmo sistema. A fronteira central é idêntica nos dois, o que é bom. Mas aqui "Identidade" é um contexto generic cuja linguagem ubíqua inclui Papel e Permissão, enquanto no Lab Role vive no UsersContext, classificado supporting, e IdentityService generic fica só com User, Session e Claim. Ou seja, autorização é generic num documento e supporting no outro. Some-se a isso a diferença de idioma nos nomes: Avaliação, Conteúdo e Matrícula aqui; GradesContext, ContentContext e UsersContext no Lab.
- **Correção:** alinhar onde ficam papel e permissão, e escolher um idioma para os nomes de contexto nos dois documentos.

### 8. Espaços múltiplos herdados da quebra de linha do markdown — [MENOR]
- **Onde:** .docx, parágrafo sobre a nota lançada em ata: "novo lançamento com   justificativa"
- **Problema:** a quebra de linha do fonte virou espaço triplo no documento final.
- **Correção:** normalizar espaços em branco na conversão.

## Riscos de fabricação

Nenhum. O documento é inteiramente qualitativo: não apresenta medição, benchmark, saída de terminal ou gráfico com dados. Os únicos elementos verificáveis são o mapa de contexto — que é byte a byte igual a entrega/assets/diagrama1.png, gerado a partir da fonte mermaid do relatório — e as tabelas, que são classificações argumentadas, não observações.

Registro à parte, que não é fabricação mas é risco de outra natureza: a seção 6 reaproveita quase literalmente o post do fórum 7.2 (problema 2), e a seção 4.1 tem redação quase idêntica à seção 3.5 do Lab Semana 07. Três entregas da mesma semana com trechos repetidos podem ser lidas como conteúdo reciclado.

## Correção conceitual — o que foi conferido e está certo

Vale registrar o que passou no teste, porque é a maior parte:

- **Core, supporting e generic** aplicados com o critério de valor competitivo, coerente com Evans e com a leitura de Khononov citada.
- **Open Host Service com Published Language** para Identidade: correto — serviço com contrato estável e muitos consumidores, formalizado em OIDC, é o caso canônico.
- **Customer/Supplier** entre Matrícula e Avaliação: direção correta, com o upstream fornecendo e a fronteira sendo negociada entre times.
- **Anticorruption Layer** entre Conteúdo e Aprendizagem: correto, com a ACL do lado do downstream traduzindo o modelo do upstream, e a justificativa certa (impedir que codec e bitrate vazem para o domínio de progresso).
- **Conformist** conceitualmente correto no texto — o sistema se adapta ao contrato do serviço externo — apesar da seta invertida no diagrama (problema 1).
- **Linguagem ubíqua** tratada como vocabulário por contexto, com o exemplo da palavra "nota" com dois sentidos usado como evidência de fronteira. É exatamente o argumento de Evans.

## Conclusão

A modelagem é boa e a fronteira central — nota mutável em Avaliação contra nota lacrada em Registro Acadêmico — está bem argumentada e é o ponto alto do trabalho. Antes de enviar: tirar a seção 6, que não foi pedida, é repetição do fórum e ainda atribui ao enunciado uma pergunta que ele não faz; ligar a tabela de domínios à de contextos, porque o enunciado avalia justamente essa coerência; e exportar em PDF dentro da faixa de páginas. A seta do Conformist é detalhe pequeno, mas é o tipo de coisa que um professor de DDD nota.
