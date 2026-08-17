# Taia — automação das atividades semanais

Toda quarta-feira: busca no Canvas da Jala as atividades da semana, junta o contexto
(enunciado, rubrica, slides e páginas do módulo), produz as entregas em pastas por
matéria/semana, gera o relatório no template `.docx` da faculdade e manda um **segundo
agente de IA revisar** cada entrega contra o enunciado.

**Nada é enviado ao Canvas.** Tudo fica no disco para você conferir e submeter à mão.

---

## Como fica organizado

```
entregas/
├── _fila.json                        fila da rodada atual
├── _RESUMO-2026-08-19.md             o que foi feito, o que ficou pendente
└── IoT/
    └── Lab Semana 06/
        ├── _contexto/                o que a IA leu (não editar)
        │   ├── enunciado.md          enunciado + rubrica + prazo, direto do Canvas
        │   ├── meta.json
        │   ├── materiais/            páginas do módulo da semana
        │   │   ├── 1-3-leituras-obrigatorias.md
        │   │   └── anexos/           slides, PDFs
        │   └── anexos/               anexos do próprio enunciado
        ├── entrega/                  ← o que você entrega
        │   ├── relatorio.md          fonte editável
        │   ├── Lab Semana 06 - IoT.docx
        │   └── src/                  código, se o lab pedir
        └── _revisao.md               parecer do agente revisor
```

---

## Instalação

### Passo 1 — token de acesso do Canvas

O login da Jala é SSO/SAML, então a automação usa um **token de acesso pessoal**
em vez da sua senha.

1. Abra <https://lms.jala.university/profile/settings>
2. Role até **Tokens de acesso aprovados** → **+ Novo token de acesso**
3. Propósito: `automacao local` · Data de expiração: em branco (ou 1 ano)
4. **Copie o token na hora** — ele só aparece uma vez.

```powershell
Copy-Item .env.example .env
notepad .env      # cole o token em CANVAS_TOKEN=
```

> Se a Jala tiver desabilitado a criação de tokens, o botão não aparece.
> Nesse caso use o cookie de sessão — instruções no `.env.example`.
> É uma solução temporária: o cookie expira em horas ou dias.

### Passo 2 — mapear as matérias

```powershell
npm run cursos
```

Lista os cursos ativos e imprime um bloco JSON pronto. Cole em `config.json` →
`cursos.apelidos` e ajuste os nomes — é o que vira o **nome da pasta**:

```json
"apelidos": {
  "1067": "IoT",
  "1102": "Banco de Dados"
}
```

### Passo 3 — CLI do Claude Code (só para a execução automática)

Rodando à mão pelo VSCode, não precisa. Para a tarefa agendada de quarta, sim:

```powershell
npm install -g @anthropic-ai/claude-code
```

### Passo 4 — agendar

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\agendar.ps1
```

Registra a tarefa toda **quarta às 08:00**. Se o PC estiver desligado, roda quando ligar.

```powershell
# outro horário
... -File scripts\agendar.ps1 -Hora 07:30
# testar agora
Start-ScheduledTask -TaskName 'Taia - Atividades semanais'
# remover
... -File scripts\agendar.ps1 -Remover
```

Os logs de cada rodada ficam em `logs/`.

---

## Uso no dia a dia

Dentro do VSCode, na extensão do Claude Code:

```
/atividades
```

Isso roda a coleta, produz as entregas, gera os `.docx` e chama o revisor. Variações:

```
/atividades --dias 21          janela maior para frente
/atividades --curso 1067       só uma matéria
/atividades --todas            inclui as que você já entregou
```

Comandos avulsos:

```powershell
npm run coletar                     # só busca no Canvas, não escreve entrega
npm run relatorio -- "entregas/IoT/Lab Semana 06"   # regera o .docx do markdown
npm run teste                       # autoteste offline do gerador de .docx
```

---

## O revisor

Depois de cada entrega, o agente `revisor-academico` lê o enunciado, a rubrica e os
materiais da semana e grava `_revisao.md` com:

- uma tabela item a item do que o enunciado pediu → **Atende / Parcial / Não atende**;
- problemas classificados em **BLOQUEANTE / IMPORTANTE / MENOR**;
- uma seção de **riscos de fabricação** — números, prints ou saídas de terminal
  apresentados como reais sem origem rastreável nos arquivos.

Se reprovar, o agente executor corrige os bloqueantes e submete de novo — no máximo
duas rodadas. Persistindo, o item entra no resumo como pendente de decisão sua.

---

## O que a automação **não** faz

- **Não submete nada ao Canvas.** Você revisa e entrega.
- **Não inventa resultado.** O que depende de rodar hardware, tirar print ou medir
  vira um marcador `> [PENDENTE: ...]` no relatório, e todos eles são listados no
  resumo da rodada. Essa é a sua lista de tarefas manuais.
- **Não faz quiz nem prova.** Ficam de fora por `config.json` → `ignorarTipos`.

O `.docx` sai pronto no template, mas o texto é rascunho de IA: leia antes de entregar.

---

## Ajustes em `config.json`

| Campo | O que faz |
|---|---|
| `janela.diasFrente` | quantos dias à frente procurar prazos (padrão 14) |
| `janela.diasAtras` | inclui atrasadas dos últimos N dias (padrão 3) |
| `cursos.apelidos` | id do curso → nome da pasta |
| `cursos.incluir` | lista de ids; vazio = todos os cursos ativos |
| `cursos.ignorar` | ids a pular |
| `ignorarTipos` | tipos não automatizáveis (padrão `["Quiz"]`) |
| `limites.maxMbPorArquivo` | pula downloads maiores que isso |
| `template` | caminho do `.docx` modelo |

---

## Estrutura do projeto

```
scripts/
├── coletar.js          Canvas → entregas/<Materia>/<Tipo> Semana NN/_contexto/
├── relatorio.js        relatorio.md → .docx no template
├── cursos.js           lista os cursos e sugere os apelidos
├── autoteste.js        22 checagens offline do pipeline
├── rodar-semana.ps1    execução headless (chamada pelo agendador)
├── agendar.ps1         registra/remove a tarefa de quarta
└── lib/
    ├── canvas.js       cliente REST do Canvas, com paginação
    ├── docx.js         preenche o template a partir de markdown
    ├── zip.js          leitor/escritor ZIP (sem dependências)
    └── util.js         semana, tipo, HTML→markdown, nomes de pasta

.claude/
├── commands/atividades.md        o fluxo da rodada semanal
├── agents/revisor-academico.md   o revisor
└── settings.json                 permissões para rodar sem prompt
```

Zero dependências npm — só Node 18+ e o PowerShell do Windows.

## Markdown aceito no `relatorio.md`

`##`/`###` títulos · `**negrito**` · `*itálico*` · `` `código` `` · listas com `-` e `1.` ·
tabelas `| a | b |` · blocos ```` ``` ```` · citações `>` · réguas `---` ·
imagens `![legenda](print.png)` com caminho relativo ao `relatorio.md`.

Cabeçalho opcional para sobrescrever o título da capa:

```markdown
---
titulo: Laboratório 6 - Internet das Coisas
atividade: Telemetria com MQTT
---
```
