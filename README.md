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

## Painel web

Um dashboard local (React + shadcn/ui) pra acompanhar tudo sem abrir o chat:
status de cada atividade, relatório/pendências/revisão direto na tela, PDF, e
botões que disparam a automação sozinha.

Primeira vez:

```powershell
cd painel
npm install
npm run build
cd ..
```

Rodar:

```powershell
npm run painel
```

Abre em <http://127.0.0.1:4848> (só local — o servidor nunca escuta na rede).
Depois de mexer no front (`painel/src/`), rode `npm run build` de novo pra
publicar; em desenvolvimento, `cd painel && npm run dev` sobe com hot reload
e recarrega a API do :4848 via proxy.

Botões:

- **Coletar do Canvas** / **Gerar resumo** — mesmos scripts do dia a dia.
- **Rodar rodada** — dispara `/atividades` sozinho: coleta, escreve os
  relatórios, gera `.docx`/`.pdf` e chama o revisor, sem digitar nada no chat.
  Pede confirmação antes, porque edita o repositório sem supervisão.
- **Revisar de novo** (dentro de cada atividade) — regera o `.docx`/`.pdf` e
  chama só o revisor pra aquela atividade (`/revisar <pasta>`), sem recoletar
  a semana inteira.

O comando disparado por esses dois últimos é configurável em `config.json` →
`agente.comando` (por padrão, `claude`). Um colega que use outro agente/modelo
troca esse valor por um wrapper próprio, desde que ele aceite
`-p "<prompt>"` e herde os mesmos `agente.flags`.

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
├── relatorio.js        relatorio.md → .docx (+ .pdf) no template
├── resumo.js           monta o _RESUMO-<data>.md a partir do que está em disco
├── cursos.js           lista os cursos e sugere os apelidos
├── painel.js           servidor do dashboard local (API + estático de painel/dist)
├── autoteste.js        checagens offline do pipeline
├── rodar-semana.ps1    execução headless (chamada pelo agendador)
├── agendar.ps1         registra/remove a tarefa de quarta
└── lib/
    ├── canvas.js       cliente REST do Canvas, com paginação
    ├── docx.js         preenche o template a partir de markdown
    ├── mermaid.js      ```mermaid → PNG (Chrome local via puppeteer-core)
    ├── codigo.js       bloco de código → imagem estilizada
    ├── pdfExport.js    .docx → .pdf (LibreOffice headless)
    ├── status.js       veredito/pendências/desatualizado de uma atividade
    ├── zip.js          leitor/escritor ZIP (sem dependências)
    └── util.js         semana, tipo, HTML→markdown, nomes de pasta

painel/                 dashboard (React + Tailwind + shadcn/ui, build com Vite)

.claude/
├── commands/atividades.md        a rodada semanal inteira
├── commands/revisar.md           regera + revisa uma atividade só
├── agents/revisor-academico.md   o revisor
└── settings.json                 permissões para rodar sem prompt
```

`scripts/` usa Node 18+ com poucas dependências (mermaid, puppeteer-core, marked —
todas pra transformar o relatório em `.docx`/`.pdf`). `painel/` é um projeto
à parte, com seu próprio `node_modules` (o toolchain do React/Tailwind/shadcn
não precisa inchar o back-end).

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
