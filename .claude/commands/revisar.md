---
description: Regenera o .docx/.pdf de uma atividade já escrita e manda o revisor-academico conferir de novo. Não coleta do Canvas nem escreve o relatorio.md do zero — para isso use /atividades.
argument-hint: "<pasta da atividade, ex: entregas/IoT/Lab Semana 06>"
allowed-tools: Bash, Read, Glob, Agent
---

Atividade: `$ARGUMENTS`

1. Confira que `$ARGUMENTS/entrega/relatorio.md` existe. Se não existir, pare e diga que essa atividade ainda não tem relatório escrito — rode `/atividades` primeiro.
2. Regenere `.docx`/`.pdf` a partir do markdown atual. **Sem `_contexto/meta.json` o `relatorio.js` não sabe nomear o arquivo e cria um novo `Atividade -.docx` em vez de sobrescrever o que já existe** — então:
   - Se já existe um `.docx` em `$ARGUMENTS/entrega/`, rode `node scripts/relatorio.js "$ARGUMENTS" --saida "entrega/<nome do .docx já existente>"`.
   - Senão, rode só `node scripts/relatorio.js "$ARGUMENTS"`.
3. Chame o agente `revisor-academico` (via Agent, `subagent_type: "revisor-academico"`) passando `$ARGUMENTS` e a instrução de gravar `_revisao.md`.
4. Leia `$ARGUMENTS/_revisao.md` e responda ao usuário em poucas linhas: o veredito e, se REPROVADO, os pontos bloqueantes.

Nunca edite `_revisao.md` para fazer a atividade passar.
