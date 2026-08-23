---
titulo: Laboratório 7 - Arquitetura de Software 2
atividade: Análise de Requisitos e Modelagem de Domínios do Prometheus V2
---

## 1. Introdução

Este laboratório cobre duas atividades sobre o caso Prometheus V2: a análise de requisitos
de negócio a partir de informação incompleta, e a segmentação do sistema em domínios e
contextos delimitados com DDD estratégico.

As duas se conectam. A análise de requisitos revela **quem quer o quê e com que qualidade**;
o DDD usa esse material para decidir **onde traçar fronteiras**. Fazer a segunda sem a
primeira produz um diagrama que reflete a estrutura técnica em vez do negócio.

---

## 2. Atividade #1 — Análise de requisitos de negócio

### 2.1. Contexto assumido

O enunciado apresenta o Prometheus V2 como um sistema educacional com informação
incompleta, simulando análise de negócio real. Os módulos considerados são gerenciamento de
usuários, qualificações, conteúdo, comunicação (fóruns e videoconferências) e acesso dos
pais.

Onde a informação é ambígua, a decisão tomada está declarada como **premissa**, que é
exatamente o que um analista faz na prática: não trava, registra a suposição e valida depois.

### 2.2. Requisitos identificados

| ID | Tipo | Requisito | Ator | Categoria de qualidade |
|---|---|---|---|---|
| FR1 | Funcional | O professor pode publicar avaliações e respectivas rubricas | Professor | – |
| FR2 | Funcional | O aluno pode consultar suas notas e a situação na disciplina | Aluno | – |
| FR3 | Funcional | O professor pode publicar conteúdo em vídeo e material de apoio | Professor | – |
| FR4 | Funcional | O responsável pode acompanhar notas e frequência do dependente | Responsável | – |
| FR5 | Funcional | Alunos e professores podem participar de fóruns por disciplina | Aluno / Professor | – |
| FR6 | Funcional | A secretaria pode emitir histórico oficial com valor legal | Secretaria | – |
| FR7 | Funcional | O sistema notifica o aluno quando uma nota é publicada | Aluno | – |
| NFR1 | Não funcional | As notas devem estar disponíveis em menos de 2 s no percentil 95 | Aluno | Desempenho |
| NFR2 | Não funcional | O sistema deve manter 99,5% de disponibilidade no período letivo | Aluno | Disponibilidade |
| NFR3 | Não funcional | Todo acesso a dado de menor deve ser autenticado e registrado | Responsável | Segurança |
| NFR4 | Não funcional | A publicação de notas deve ser concluída em até 3 cliques | Professor | Usabilidade |
| NFR5 | Não funcional | Um módulo deve ser implantado sem indisponibilizar os demais | Equipe de TI | Manutenibilidade |
| NFR6 | Não funcional | O vídeo deve iniciar em menos de 3 s em conexão de 5 Mbps | Aluno | Desempenho |
| NFR7 | Não funcional | Dados pessoais devem obedecer à LGPD quanto a retenção e consentimento | Instituição | Conformidade |

### 2.3. Observações da análise

**O ator revela o conflito.** NFR1 (aluno quer nota rápida) e FR6 (secretaria quer registro
íntegro) puxam a arquitetura em direções opostas. Associar cada requisito a um ator torna
esse conflito visível na tabela, em vez de ele aparecer só na implementação.

**NFR3 tem ator não óbvio.** O requisito de auditoria de acesso a dado de menor é do
responsável e da instituição, não do aluno. Requisitos de conformidade costumam ter como
ator alguém que nunca usa a tela.

**Premissa registrada.** O enunciado não define se "acesso dos pais" vale para aluno maior
de idade. Assumiu-se que **o vínculo é encerrado na maioridade, salvo consentimento
explícito do aluno** — decisão com impacto direto em NFR3 e NFR7, e que precisa de validação
com a coordenação.

### 2.4. Regras de negócio

**RN1 — Composição e arredondamento da média.**
A média final é a soma das avaliações ponderadas pelo peso da rubrica, arredondada a uma
casa decimal. O aluno é aprovado com média ≥ 7,0; entre 4,0 e 6,9 vai para recuperação; abaixo
de 4,0 está reprovado sem direito a recuperação.
*Por que é regra de negócio e não detalhe técnico:* o ponto de corte e a política de
arredondamento mudam o resultado acadêmico de pessoas reais, e variam por instituição. Regra
assim pertence ao domínio, nunca à camada de apresentação.

**RN2 — Imutabilidade do lançamento em ata.**
Uma nota lançada em ata não pode ser alterada. Correção posterior gera um novo lançamento,
com justificativa, autor e data, preservando o registro anterior no histórico.
*Por que é regra de negócio:* decorre do valor legal do documento. É também a regra que
justifica a fronteira entre Avaliação e Registro Acadêmico na atividade #2.

---

## 3. Atividade #2 — Domínios e contextos delimitados

### 3.1. Classificação dos domínios

| Domínio | Tipo | Justificativa |
|---|---|---|
| Avaliação e qualificações | **Core** | Impacta diretamente a missão da escola; a regra de avaliação é própria da instituição |
| Conteúdo educacional | **Core** | A qualidade da entrega de aula é o que diferencia a experiência |
| Gerenciamento de usuários | **Supporting** | Necessário para autenticação e vínculo, mas segue padrão do setor |
| Acesso dos pais | **Supporting** | Alto valor institucional, sem diferencial competitivo técnico |
| Comunicação — fóruns | **Supporting** | Sustenta engajamento; regras simples |
| Videoconferência | **Generic** | Serviço externo maduro (Zoom, Meet); não se constrói |
| Identidade e autenticação | **Generic** | Problema resolvido; usar provedor OIDC |
| Notificação | **Generic** | Serviço de mercado |

### 3.2. Tabela DDD dos contextos delimitados

| Contexto | Tipo de domínio | Justificativa | Linguagem ubíqua |
|---|---|---|---|
| **GradesContext** | Core | Impacta diretamente a missão da escola | *Assessment*, *Rubric*, *Attempt*, *Weight*, *Standing* |
| **ContentContext** | Core | Entrega de aula é o produto percebido pelo aluno | *Resource*, *Version*, *Publication*, *Transcoding* |
| **AcademicRecordContext** | Supporting | Documento oficial com valor legal e regras próprias | *Transcript*, *Minute*, *Entry*, *Certificate* |
| **UsersContext** | Supporting | Necessário para autenticação e vínculo | *Enrollment*, *Role*, *Profile*, *Guardianship* |
| **GuardianContext** | Supporting | Acesso do responsável tem regra de consentimento própria | *Guardian*, *Dependent*, *Consent*, *Visibility* |
| **ForumContext** | Supporting | Interação assíncrona por disciplina | *Topic*, *Reply*, *Participant* |
| **VideoService** | Generic | Serviço externo | *Meeting*, *Join link*, *Recording* |
| **IdentityService** | Generic | Provedor OIDC de terceiros | *User*, *Session*, *Claim* |
| **NotificationService** | Generic | Serviço externo de entrega | *Channel*, *Template*, *Delivery* |

### 3.3. Mapa de contexto

```mermaid Figura 1 — Contextos delimitados, tipo de domínio e contratos entre eles
flowchart TB
  ALUNO(["Aluno"])
  PROF(["Professor"])
  RESP(["Responsável"])
  SEC(["Secretaria"])

  GRADES["GradesContext<br/><b>CORE</b>"]
  CONTENT["ContentContext<br/><b>CORE</b>"]
  RECORD["AcademicRecordContext<br/><i>supporting</i>"]
  USERS["UsersContext<br/><i>supporting</i>"]
  GUARD["GuardianContext<br/><i>supporting</i>"]
  FORUM["ForumContext<br/><i>supporting</i>"]
  IDENT["IdentityService<br/>generic"]
  VIDEO["VideoService<br/>generic"]
  NOTIF["NotificationService<br/>generic"]

  PROF --> GRADES
  PROF --> CONTENT
  ALUNO --> GRADES
  ALUNO --> FORUM
  RESP --> GUARD
  SEC --> RECORD

  IDENT -- "OHS / Published Language<br/>(OIDC)" --> USERS
  USERS -- "upstream:<br/>matrícula e papel" --> GRADES
  USERS -- "upstream" --> FORUM
  USERS -- "upstream:<br/>vínculo de tutela" --> GUARD
  GRADES -- "ACL: só nota consolidada,<br/>nunca rascunho" --> GUARD
  GRADES -- "evento:<br/>NotaLancadaEmAta" --> RECORD
  GRADES -- "evento:<br/>NotaPublicada" --> NOTIF
  CONTENT -- "ACL" --> FORUM
  CONTENT -- "conformist" --> VIDEO
  FORUM -- "evento" --> NOTIF

  classDef core fill:#dcfce7,stroke:#16a34a,stroke-width:3px
  classDef sup fill:#dbeafe,stroke:#3b82f6,stroke-width:2px
  classDef gen fill:#f3f4f6,stroke:#9ca3af,stroke-dasharray:4 3
  classDef ator fill:#fef3c7,stroke:#f59e0b
  class GRADES,CONTENT core
  class RECORD,USERS,GUARD,FORUM sup
  class IDENT,VIDEO,NOTIF gen
  class ALUNO,PROF,RESP,SEC ator
```

O diagrama usa as convenções pedidas: **verde com borda grossa** para core, **azul** para
supporting, **cinza tracejado** para generic, e amarelo para atores externos. Cada seta traz
o tipo de contrato.

### 3.4. Contratos entre contextos

| Relação | Padrão | Por quê |
|---|---|---|
| IdentityService → UsersContext | **OHS / Published Language** | Contrato padronizado (OIDC), muitos consumidores, nenhum negocia formato |
| UsersContext → Grades / Forum / Guardian | **Customer/Supplier** | Todos dependem de matrícula e papel; fronteira negociada entre times |
| GradesContext → GuardianContext | **Anticorruption Layer** | O responsável vê nota consolidada, nunca rascunho em correção. A ACL filtra e traduz |
| GradesContext → AcademicRecordContext | **Event-driven** | Lançamento em ata é fato consumado (RN2), assíncrono e auditável |
| ContentContext → VideoService | **Conformist** | Serviço externo dita o contrato; não vale construir camada de tradução |
| Grades / Forum → NotificationService | **Conformist** | Idem |

### 3.5. A fronteira mais importante

A separação entre **GradesContext** e **AcademicRecordContext** é a decisão central, e é
consequência direta da RN2 da atividade #1.

Os dois lidam com nota, mas com regras de mudança opostas: em Grades a nota é mutável por
natureza — o professor corrige, o aluno recupera; em Record ela é imutável, porque o
documento tem valor legal. Unir os dois obrigaria o mesmo agregado a ser simultaneamente
editável e lacrado, produzindo flags de estado e regras condicionais espalhadas — o sintoma
clássico de fronteira mal traçada.

O mesmo raciocínio vale para o **GuardianContext**: o responsável não é um "usuário com
menos permissões", e sim um ator com regras próprias de consentimento e visibilidade.
Modelá-lo como papel dentro de Users empurraria regra de tutela para dentro de um contexto
que só deveria saber de autenticação.

---

## 4. Conclusão

O laboratório deixa claro o encadeamento entre as duas atividades: a regra de negócio RN2,
descoberta na análise de requisitos, é o que **justifica tecnicamente** a fronteira entre
Grades e Record na modelagem. Sem a análise, essa separação pareceria complexidade
desnecessária; com ela, unir os dois é que seria o erro.

A lição arquitetural é que fronteira boa não vem de divisão técnica por camadas, e sim de
divergência real no negócio — em vocabulário, em regra de mudança, ou em quem é o dono da
decisão.

> [PENDENTE: se o Faculty Practitioner pedir o diagrama numa ferramenta específica
> (Lucidchart, Miro, Draw.io), reproduzir o mapa da seção 3.3 nela e anexar a exportação.]

## 5. Referências

- Evans, E. *Domain-Driven Design*. Addison-Wesley.
- Vernon, V. *Implementing Domain-Driven Design*. Addison-Wesley — Context Mapping.
- Khononov, V. *Learning Domain-Driven Design*. O'Reilly — classificação de subdomínios.
- Brandolini, A. *Strategic Domain Driven Design with Context Mapping*. <https://www.infoq.com/articles/ddd-contextmapping/>
- Wiegers, K.; Beatty, J. *Software Requirements*. 3ª ed. Microsoft Press — classificação de requisitos.
- ISO/IEC 25010 — modelo de qualidade de produto de software.
- Material da semana: Módulo 7 — Análise de negócio e DDD.
