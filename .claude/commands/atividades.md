---
description: Rodada semanal — coleta as atividades do Canvas, produz as entregas em entregas/<Materia>/<Tipo> Semana NN/, gera o .docx no template e manda o revisor conferir cada uma.
argument-hint: "[--dias 14] [--curso <id>] [--todas]"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent
---

Rodada semanal de atividades. Argumentos recebidos: `$ARGUMENTS`

## Passo 1 — Coletar

```
node scripts/coletar.js $ARGUMENTS
```

Leia `entregas/_fila.json`. Se `total` for 0, escreva uma linha dizendo que não há nada pendente na janela e **pare**.

Se o script falhar por credencial, pare e diga ao usuário para conferir o `CANVAS_TOKEN` no `.env` (o README tem o passo a passo). Não tente contornar o login.

## Passo 2 — Para cada item da fila com `automatizavel: true`

Trate um item por vez, do prazo mais próximo para o mais distante.

### 2.1 Entender

Leia `<pasta>/_contexto/enunciado.md` inteiro, e depois `<pasta>/_contexto/materiais/**`. Os materiais da semana definem **qual abordagem** o curso espera: use as ferramentas e a terminologia que aparecem ali, não a solução mais elegante que você conhece. Se o slide da semana ensinou uma biblioteca específica, use aquela.

Se o enunciado for vago ou estiver vazio, diga isso explicitamente no relatório em vez de inventar o que o professor queria.

### 2.2 Produzir

Escreva em `<pasta>/entrega/`:

- **`relatorio.md`** — o relatório. Se o enunciado define seções obrigatórias, **as seções do enunciado mandam**. Não havendo, use: Objetivo · Fundamentação teórica · Materiais e ambiente · Desenvolvimento · Resultados · Discussão · Dificuldades · Conclusão · Referências.
- **Código, diagramas e arquivos** que o enunciado pedir, em subpastas (`entrega/src/`, `entrega/diagramas/`).

**Faça só o obrigatório.** Entregue o que o enunciado exige para pontuar e pare aí:

- Onde o enunciado oferece alternativas ("paho-mqtt **ou outra**", "RabbitMQ, Mosquitto, emqx **ou outros**"), escolha **uma** — a que aparece nos materiais da semana — e não implemente as outras.
- Itens marcados como opcional, bônus, extra, desafio, "se quiser" ou "para aprofundar" ficam de fora.
- Não acrescente seções, testes, diagramas ou features que ninguém pediu. Escopo extra não dá nota e aumenta a chance de erro.
- Se algo é obrigatório mas você não consegue fazer (precisa do repositório do aluno, de hardware, de medição real), isso **não** é opcional: entregue o que dá e marque o resto como `[PENDENTE: ...]`.

Regras que não se negociam:

- **Não invente resultado.** Se algo depende de rodar hardware, tirar print ou medir, escreva `> [PENDENTE: inserir print do terminal mostrando X]` e siga. Um marcador honesto vale mais do que um número inventado — e o revisor vai reprovar dados fabricados.
- **Pendência não vai para o documento entregue.** O `relatorio.js` retira todo bloco `> [PENDENTE: ...]` / `> [BLOQUEANTE: ...]` do `.docx` e o move para `_pendencias.md`, junto com qualquer seção que fique vazia. Continue escrevendo os marcadores normalmente no markdown — eles são o canal para avisar o usuário —, mas **não crie seções do tipo "Pendências" ou "Capturas de tela"** que existam só para hospedá-los: elas viram título órfão. Ao final, relate as pendências ao usuário na resposta.
- **Diagrama é mermaid, não desenho ASCII.** Use um bloco ```mermaid com a legenda na mesma linha da cerca — `` ```mermaid Figura 1 — Arquitetura `` — e o `relatorio.js` renderiza em PNG e embute como figura legendada. Prefira `flowchart` para arquitetura e `sequenceDiagram` para fluxo temporal. Desenho com caracteres de caixa só se o mermaid não der conta.
- **Rode o que der para rodar.** Se produziu código, execute ou valide a sintaxe, e reporte a saída real no relatório.
- Escreva em português do Brasil, no nível de um aluno da matéria — não em tom de artigo científico nem de post de blog.
- Cite as fontes dos materiais da semana em Referências.

O markdown aceita `##`/`###`, listas, tabelas `| a | b |`, blocos ``` de código, citações `>` e imagens `![legenda](arquivo.png)` com caminho relativo a `entrega/`.

### 2.3 Gerar o .docx

```
node scripts/relatorio.js "<pasta>"
```

O script preenche o template da faculdade (capa, logo e nome do aluno já vêm prontos). Se ele reclamar, conserte o markdown e rode de novo.

### 2.4 Revisar

Chame o agente `revisor-academico` (via Agent, `subagent_type: "revisor-academico"`) passando o caminho da pasta e a instrução de gravar `_revisao.md`.

Leia `<pasta>/_revisao.md` quando ele terminar:

- **APROVADO** → siga para o próximo item.
- **APROVADO COM RESSALVAS** → registre as ressalvas no resumo final e siga.
- **REPROVADO** → corrija **apenas os pontos BLOQUEANTES**, regenere o `.docx` e chame o revisor de novo. No máximo **2 rodadas de correção**. Se ainda reprovar, pare com aquele item, deixe o `_revisao.md` no lugar e registre no resumo que ficou pendente de decisão humana.

Nunca edite `_revisao.md` para fazer um item passar.

## Passo 3 — Resumo da rodada

Rode `node scripts/resumo.js` — ele monta a tabela a partir da fila, dos vereditos gravados pelo revisor e dos `_pendencias.md`, e marca com ⚠ toda revisão anterior à última edição do relatório. Complemente o arquivo gerado com o que mais for relevante.

Escreva `entregas/_RESUMO-<AAAA-MM-DD>.md`:

```markdown
# Rodada de <data>

| Matéria | Atividade | Prazo | Veredito | Pendências |
|---|---|---|---|---|
```

Depois liste, em seção separada:
- todo marcador `[PENDENTE: ...]` que sobrou, agrupado por atividade — é o que o usuário precisa fazer à mão;
- itens da fila com `automatizavel: false` (quiz, prova) que ficaram de fora;
- itens que reprovaram nas 2 rodadas.

## Passo 4 — Fechar

Responda ao usuário em no máximo 12 linhas: quantas atividades foram feitas, quais passaram, quais precisam de atenção, e onde estão os arquivos.

**Nada é enviado ao Canvas.** As entregas ficam no disco para o usuário conferir e submeter. Não tente submeter, mesmo que o enunciado peça.
