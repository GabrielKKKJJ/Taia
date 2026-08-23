---
titulo: Tarefa 7 - Arquitetura de Software 2
atividade: Análise de Negócio e Design Orientado ao Domínio no Prometheus V2
---

## 1. Objetivo

Aplicar análise de negócio e *Domain-Driven Design* ao sistema educacional Prometheus V2:
identificar stakeholders e seus requisitos, classificar os domínios, propor contextos
delimitados justificados e apresentar um mapa de contexto.

A premissa que orienta o documento é a de que **DDD é uma ferramenta de decisão sobre onde
traçar fronteiras**, e não um estilo de codificação. A pergunta que ele responde não é
"como escrevo esta classe", e sim "o que pertence junto e o que precisa ficar separado".

## 2. Stakeholders e requisitos principais

| Stakeholder | O que espera do sistema | Requisito principal |
|---|---|---|
| **Aluno** | Ver aulas, entregar trabalhos, acompanhar notas | Disponibilidade e latência baixa na consulta |
| **Professor** | Publicar conteúdo, avaliar, acompanhar turma | Correção da avaliação e rastreabilidade da nota |
| **Coordenação acadêmica** | Acompanhar desempenho e evasão | Relatórios consolidados e confiáveis |
| **Secretaria** | Matrícula, histórico, documentos oficiais | Integridade e valor legal do registro |
| **Equipe de TI** | Operar, escalar e evoluir o sistema | Modularidade e observabilidade |
| **Instituição** | Conformidade e custo | LGPD, auditoria, previsibilidade de gasto |

Duas observações de análise de negócio importam aqui.

A primeira é que **os stakeholders discordam sobre o que é urgente**. Para o aluno, a nota
precisa aparecer imediatamente; para a secretaria, ela precisa ser correta e imutável.
Essas duas exigências puxam a arquitetura em direções opostas — velocidade de leitura
versus integridade transacional — e é exatamente esse conflito que justifica separar
contextos em vez de manter um modelo único.

A segunda é que **a palavra "nota" significa coisas diferentes conforme quem fala**. Para o
professor, é um valor que pode ser revisto. Para a secretaria, é um registro histórico
lacrado. Tratar as duas como a mesma entidade é a origem clássica do modelo anêmico que
tenta servir a todos e não serve bem a ninguém.

## 3. Classificação de domínios

O critério de classificação é o valor competitivo: o domínio **core** é aquele em que errar
significa perder a razão de existir do produto; o **supporting** é necessário mas não
diferencia; o **generic** é problema resolvido que se compra pronto.

| Domínio | Classificação | Justificativa |
|---|---|---|
| **Avaliação e Aprendizagem** | **Core** | É a razão de ser de um LMS. A regra de cálculo de média, recuperação e aprovação é específica da instituição e muda o resultado da vida do aluno |
| **Entrega de Conteúdo** | **Core** | Experiência de aprendizagem depende diretamente de vídeo e material chegarem bem |
| **Gestão Acadêmica** (matrícula, turmas) | **Supporting** | Necessário para o core funcionar, mas segue regras padronizadas do setor |
| **Comunicação** (avisos, fórum) | **Supporting** | Importante para engajamento; não diferencia a instituição |
| **Identidade e Acesso** | **Generic** | Autenticação é problema resolvido — usar Keycloak ou provedor SSO |
| **Notificação** (e-mail, push) | **Generic** | Serviço de mercado; não vale construir |
| **Relatórios e BI** | **Supporting** | Alto valor gerencial, baixo diferencial competitivo |

A consequência prática dessa classificação é de alocação de esforço: **o time mais forte
trabalha no core**. Construir do zero um serviço de autenticação enquanto o cálculo de
média está mal modelado é um erro de priorização que o DDD ajuda a evitar.

## 4. Contextos delimitados propostos

| Contexto | Responsabilidade | Linguagem ubíqua |
|---|---|---|
| **Avaliação** | Registrar avaliações, calcular média e situação | Avaliação, Rubrica, Tentativa, Situação, Peso |
| **Aprendizagem** | Trilha, progresso, conclusão de módulo | Trilha, Módulo, Progresso, Conclusão |
| **Conteúdo** | Vídeos, materiais, versionamento e publicação | Recurso, Versão, Publicação, Transcodificação |
| **Matrícula** | Vínculo aluno-turma-período | Matrícula, Turma, Período, Vaga |
| **Registro Acadêmico** | Histórico oficial e documentos com valor legal | Histórico, Ata, Certificado, Lançamento |
| **Comunicação** | Fórum, avisos, mensagens | Tópico, Aviso, Mensagem, Participante |
| **Identidade** | Autenticação e perfis | Usuário, Papel, Sessão, Permissão |

### 4.1. Por que "Avaliação" e "Registro Acadêmico" são contextos separados

Esta é a decisão de fronteira mais importante do desenho, e vale justificá-la em detalhe.

Os dois lidam com notas. A tentação natural é unificá-los. Mas eles têm **regras de
mudança opostas**:

- Em **Avaliação**, a nota é mutável por natureza. O professor corrige, o aluno faz
  recuperação, a rubrica é reaplicada. O modelo precisa suportar revisão.
- Em **Registro Acadêmico**, a nota é um **fato consumado**. Depois de lançada em ata, ela
  não muda — uma correção posterior não sobrescreve, gera um novo lançamento com
  justificativa e trilha de auditoria, porque o documento tem valor legal.

Unir os dois obrigaria o mesmo agregado a ser simultaneamente editável e imutável. O
resultado inevitável seria uma explosão de flags de estado e regras condicionais — o
sintoma clássico de fronteira mal traçada. Separando, cada contexto fica com um modelo
coerente, e a passagem de um para o outro vira um evento explícito de domínio:
`NotaLancadaEmAta`.

### 4.2. Por que "Conteúdo" é separado de "Aprendizagem"

Conteúdo trata do **artefato**: um vídeo tem versão, formato, transcodificação, direitos de
uso. Aprendizagem trata do **percurso**: um aluno assistiu, progrediu, concluiu. O mesmo
vídeo participa de várias trilhas, e a mesma trilha sobrevive à substituição de um vídeo.
São ciclos de vida independentes.

## 5. Mapa de contexto

```mermaid Figura 1 — Mapa de contexto do Prometheus V2, com atores e relações
flowchart TB
  ALUNO(["Aluno"])
  PROF(["Professor"])
  SEC(["Secretaria"])
  COORD(["Coordenação"])

  IDENT["Identidade<br/><i>generic</i>"]
  MATR["Matrícula<br/><i>supporting</i>"]
  AVAL["Avaliação<br/><b>core</b>"]
  APRE["Aprendizagem<br/><b>core</b>"]
  CONT["Conteúdo<br/><b>core</b>"]
  REG["Registro Acadêmico<br/><i>supporting</i>"]
  COM["Comunicação<br/><i>supporting</i>"]
  NOT["Notificação<br/><i>generic</i>"]

  ALUNO --> APRE
  ALUNO --> AVAL
  PROF --> AVAL
  PROF --> CONT
  SEC --> REG
  SEC --> MATR
  COORD --> REG

  IDENT -- "OHS/PL" --> MATR
  IDENT -- "OHS/PL" --> AVAL
  MATR -- "upstream:<br/>quem cursa o quê" --> AVAL
  MATR -- "upstream" --> APRE
  CONT -- "ACL:<br/>recurso publicado" --> APRE
  AVAL -- "evento:<br/>NotaLancadaEmAta" --> REG
  AVAL -- "evento:<br/>NotaPublicada" --> NOT
  COM -- "evento" --> NOT

  classDef core fill:#dcfce7,stroke:#22c55e,stroke-width:2px
  classDef sup fill:#dbeafe,stroke:#3b82f6
  classDef gen fill:#f3f4f6,stroke:#9ca3af
  classDef ator fill:#fef3c7,stroke:#f59e0b
  class AVAL,APRE,CONT core
  class MATR,REG,COM sup
  class IDENT,NOT gen
  class ALUNO,PROF,SEC,COORD ator
```

### 5.1. Padrões de relacionamento adotados

| Relação | Padrão | Justificativa |
|---|---|---|
| Identidade → demais | **Open Host Service / Published Language** | Serviço genérico com contrato estável (OIDC); muitos consumidores, nenhum negocia formato |
| Matrícula → Avaliação | **Customer/Supplier** | Avaliação depende de saber quem cursa o quê; a fronteira é negociada entre os times |
| Conteúdo → Aprendizagem | **Anticorruption Layer** | Aprendizagem traduz o modelo de recurso para o seu próprio conceito de material da trilha, sem herdar detalhes de transcodificação |
| Avaliação → Registro | **Event-driven** | O lançamento em ata é um fato, não uma chamada. Assíncrono e auditável |
| Avaliação/Comunicação → Notificação | **Conformist** | O serviço de notificação é externo; o sistema se adapta ao contrato dele |

A **Anticorruption Layer** entre Conteúdo e Aprendizagem merece nota: sem ela, o conceito
de "codec" e "bitrate" vazaria para dentro do domínio de progresso do aluno, que não tem
nada a ver com isso. A ACL é a defesa contra o modelo de um contexto contaminar o outro.

## 6. Aplicando DDD a requisitos ambíguos

O enunciado da semana levanta a questão de como usar DDD quando o stakeholder não sabe
dizer o que quer. A resposta que este desenho ilustra tem três movimentos:

**Buscar a palavra, não a tela.** Quando o pedido é vago — "quero acompanhar melhor os
alunos" — a pergunta produtiva não é "que botão você quer", e sim "o que significa
*acompanhar* no seu dia". A ambiguidade quase sempre está no vocabulário, e é ali que ela
precisa ser resolvida.

**Tratar sinônimo divergente como sinal de fronteira.** Quando duas pessoas usam a mesma
palavra com sentidos diferentes — "nota" para o professor e para a secretaria — isso não é
confusão a ser eliminada. É evidência de que existem dois contextos, e forçar um vocabulário
único destruiria informação legítima.

**Adiar o que é incerto e proteger o que é estável.** Requisito mal definido em domínio
*supporting* pode ser implementado de forma simples e revisto depois. Em domínio *core*, a
ambiguidade precisa ser resolvida antes, porque errar a fronteira ali custa caro. O que
mantém o sistema sustentável é que a incerteza fique confinada dentro de um contexto, em vez
de atravessar todos eles.

## 7. Conclusão

A contribuição do DDD ao Prometheus V2 não é um diagrama mais bonito: é o critério para
decidir **onde o sistema pode ser cortado sem quebrar significado**. As fronteiras propostas
aqui saem de conflitos reais de negócio — nota mutável contra nota lacrada, artefato contra
percurso — e não de uma divisão técnica por camadas.

A consequência prática é a escalabilidade e a manutenibilidade que a atividade pede: cada
contexto pode ser implantado, escalado e evoluído no seu próprio ritmo, e uma mudança de
regra na avaliação não obriga a tocar no registro acadêmico. Fronteiras boas não são as que
separam mais, e sim as que fazem a mudança parar de se propagar.

## 8. Referências

- Evans, E. *Domain-Driven Design: Tackling Complexity in the Heart of Software*. Addison-Wesley.
- Vernon, V. *Implementing Domain-Driven Design*. Addison-Wesley — Context Mapping.
- Brandolini, A. *Strategic Domain Driven Design with Context Mapping*. <https://www.infoq.com/articles/ddd-contextmapping/>
- Fowler, M. *BoundedContext*. <https://martinfowler.com/bliki/BoundedContext.html>
- Khononov, V. *Learning Domain-Driven Design*. O'Reilly — classificação de subdomínios.
- Material da semana: Módulo 7 — Análise de negócio e DDD.
