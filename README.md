# Taia — automação das atividades semanais

Toda quarta-feira: busca no Canvas da Jala as atividades da semana, junta o contexto
(enunciado, rubrica, slides e páginas do módulo), produz as entregas em pastas por
matéria/semana, gera o relatório no template `.docx` da faculdade e manda um **segundo
agente de IA revisar** cada entrega contra o enunciado.

Por padrão, nada é enviado ao Canvas — a entrega fica no disco pra você conferir e
submeter à mão. O painel web tem um botão **Entregar no Canvas** que manda de
verdade (upload + submissão oficial), mas só quando você clica e confirma; nada
disso acontece sozinho durante a rodada automática.

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
        ├── _chat/                    conversa do painel com essa atividade
        │   ├── historico.json        mensagens (lidas por /atividades e pelo revisor)
        │   ├── sessao.json           id da sessão do agente, pra manter contexto
        │   └── anexos/               imagens/arquivos anexados no chat
        └── _revisao.md               parecer do agente revisor
```

`entregas/` inteira é local — está no `.gitignore`, não faz parte do
repositório. Um clone novo do Taia começa sem essa pasta; ela nasce ao rodar
`npm run coletar` ou `/atividades` pela primeira vez.

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

### Passo 3 — CLI do Claude Code

Rodando `/atividades` à mão pelo VSCode, não precisa instalar nada à parte. Mas
é obrigatório para a tarefa agendada de quarta **e** para os botões do painel
web que disparam o agente (Rodar rodada, Revisar de novo, chat da atividade):

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

Um dashboard local (React + shadcn/ui) pra acompanhar e mexer em tudo sem abrir
o chat: status de cada atividade, relatório/pendências/revisão direto na tela,
notas do Canvas, e um chat por atividade que corrige o relatório na hora.

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

### Aba Atividades

- **Coletar do Canvas** / **Gerar resumo** — mesmos scripts do dia a dia.
- **Rodar rodada** — dispara `/atividades` sozinho: coleta, escreve os
  relatórios, gera `.docx`/`.pdf` e chama o revisor, sem digitar nada no chat.
  Pede confirmação antes, porque edita o repositório sem supervisão.
- Abrindo uma atividade:
  - **Regerar atividade** / **Revisar de novo** — o segundo regera o
    `.docx`/`.pdf` e chama só o revisor pra aquela atividade
    (`/revisar <pasta>`), sem recoletar a semana inteira.
  - **Entregar no Canvas** — sobe o PDF (ou o `.docx`, se não houver PDF) e
    submete oficialmente na tarefa do Canvas. Pede confirmação no navegador
    antes de mandar; precisa que `_contexto/meta.json` exista (rode "Coletar
    do Canvas" antes).
  - **Limpar atividade** — apaga `entrega/`, `_revisao.md` e `_pendencias.md`
    pra recomeçar do zero. Mantém o enunciado e os materiais.
  - **Materiais** — sobe arquivos extras (prints, anotações, PDFs) pra
    `_contexto/materiais/`, como contexto a mais pro agente considerar.
  - **Chat da atividade** — conversa de verdade, com memória entre mensagens:
    pergunte algo e ele só responde; peça uma correção e ele edita o
    `relatorio.md` direto, na hora. Dá pra anexar imagem, PDF, texto ou
    código — ele lê o anexo antes de responder. Fica salvo em
    `<pasta>/_chat/`.

### Aba Notas

Notas atuais de cada matéria, puxadas direto do Canvas, com o detalhamento
por atividade.

### Aba Configurações

Onde ficam o token do Canvas, as chaves de API (Anthropic, OpenAI, OpenRouter,
Gemini — gravadas no `.env`) e a configuração do agente: qual comando/modelo
os botões acima disparam. Equivale a editar `config.json` → `agente` e o
`.env` na mão, só que pela tela.

O comando disparado por "Rodar rodada", "Revisar de novo" e o chat é
configurável em `config.json` → `agente.comando` (por padrão, `claude`). Um
colega que use outro agente/modelo troca esse valor por um wrapper próprio,
desde que ele aceite `-p "<prompt>"` e herde os mesmos `agente.flags`.

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

- **A rodada automática (`/atividades`, tarefa agendada) não submete nada ao
  Canvas.** Você revisa e entrega — à mão, ou pelo botão **Entregar no
  Canvas** do painel, que existe separado e pede confirmação antes de mandar.
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
    ├── canvas.js       cliente REST do Canvas — leitura com paginação, e envio/submissão (usado só pelo botão "Entregar no Canvas")
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
