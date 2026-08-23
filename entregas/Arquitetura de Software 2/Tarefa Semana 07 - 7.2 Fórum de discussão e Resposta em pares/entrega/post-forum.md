# 7.2 Fórum — Arquitetura de Software 2 (Semana 7)

> Formato de entrega: `discussion_topic`. Cole o texto direto no fórum do Canvas.
> As instruções pedem resposta a **dois** colegas.

---

## PARTE 1 — Post inicial

### Pergunta 1 — Benefícios dos contextos delimitados, e efeito em escalabilidade e manutenibilidade

O benefício central de um contexto delimitado é permitir que **a mesma palavra signifique
coisas diferentes em lugares diferentes, sem que isso vire bug**.

No Prometheus, o exemplo mais claro é a palavra "nota". Para o professor, é um valor
mutável: ele corrige, o aluno faz recuperação, a rubrica é reaplicada. Para a secretaria, é
um registro lacrado com valor legal, que não pode ser alterado — uma correção posterior gera
novo lançamento com justificativa e trilha de auditoria, preservando o anterior.

Se os dois compartilharem o mesmo modelo, esse modelo precisa ser simultaneamente editável e
imutável. O resultado inevitável é uma proliferação de flags de estado e regras condicionais
— aquele código onde toda função começa com três `if` verificando em que situação a entidade
está. Separando em `GradesContext` e `AcademicRecordContext`, cada um fica com um modelo
coerente, e a passagem de um para o outro vira um evento explícito do domínio.

**Efeito na manutenibilidade.** É aqui que está o ganho maior, e ele é sutil: fronteira boa
não é a que separa mais, é a que faz **a mudança parar de se propagar**. Quando a
coordenação altera a regra de arredondamento da média, essa mudança fica contida no contexto
de Avaliação. Sem fronteira, ela alcançaria o histórico, os relatórios e a emissão de
certificado, e cada um desses lugares teria que ser testado de novo.

**Efeito na escalabilidade.** Contextos delimitados são a pré-condição para escalar por
partes. Consulta de nota e emissão de histórico têm perfis de carga completamente
diferentes: a primeira é altíssima e em rajada, a segunda é rara e pesada. Como contextos
separados, cada um escala no seu ritmo e com a tecnologia adequada — cache e réplicas de
leitura de um lado, consistência transacional forte do outro. Num modelo único, seria
preciso escalar o conjunto inteiro pelo pior caso.

Vale a ressalva: contexto delimitado tem custo. Introduz tradução entre modelos,
consistência eventual e mais partes móveis. Aplicar a um sistema pequeno é complexidade sem
retorno. O critério é a existência de divergência real de linguagem ou de regra de mudança —
não o desejo de parecer moderno.

### Pergunta 2 — Aplicar DDD diante de requisitos ambíguos

Quando o stakeholder não sabe dizer o que quer, o erro comum é insistir na pergunta
"o que você quer?" e receber de volta uma tela desenhada. O DDD oferece três movimentos mais
produtivos.

**Primeiro: perseguir a palavra, não a funcionalidade.** Diante de um pedido vago como
"quero acompanhar melhor os alunos", a pergunta útil não é "que botão você precisa", e sim
"o que significa *acompanhar* no seu dia a dia, e o que você faz depois que descobre o que
queria saber?". A ambiguidade quase sempre está no vocabulário, e é ali que precisa ser
resolvida. A linguagem ubíqua não é um glossário que se escreve no fim do projeto: é o
instrumento de investigação.

**Segundo: tratar divergência de vocabulário como sinal, não como ruído.** Quando duas
pessoas usam a mesma palavra com sentidos diferentes, a reação instintiva é padronizar. O
DDD sugere o contrário: isso é **evidência de que existem dois contextos**. Forçar um
vocabulário único destrói informação legítima e produz aquele modelo genérico que atende
todo mundo pela metade. Em vez de eliminar a divergência, ela vira uma fronteira no mapa de
contexto.

**Terceiro: distribuir a incerteza conforme o tipo de domínio.** Requisito mal definido num
domínio *supporting* pode ser implementado da forma mais simples possível e revisto depois —
o custo de errar é baixo. Num domínio *core*, a ambiguidade precisa ser resolvida antes de
codificar, porque errar a fronteira ali é caro e difícil de desfazer. Essa priorização é
prática: em vez de travar o projeto esperando clareza total, resolve-se primeiro o que
sustenta a estratégia.

Um recurso que ajuda muito nessa fase é o **Event Storming**. Em vez de pedir requisitos,
pede-se que as pessoas descrevam os *eventos* que acontecem no negócio — "nota publicada",
"aluno matriculado", "ata fechada". Eventos são mais fáceis de descrever que funcionalidades,
porque as pessoas os vivem. E os agrupamentos naturais que emergem no quadro costumam ser,
eles mesmos, os contextos delimitados.

O que mantém a arquitetura sustentável no fim das contas é que a incerteza fique **confinada
dentro de um contexto**, em vez de atravessar todos eles. Um requisito que muda dentro de
uma fronteira é manutenção; um requisito que muda atravessando cinco módulos é reescrita.

---

## PARTE 2 — Respostas aos colegas

> São necessárias **duas** respostas. Escolha dois colegas e adapte.

**Modelo A — se o colega focou nos benefícios técnicos dos bounded contexts:**

Concordo com os pontos que você levantou, principalmente sobre a independência de deploy.
Eu acrescentaria um critério que me ajudou a decidir onde cortar: quando duas áreas do
negócio usam a mesma palavra com sentidos diferentes, isso já é a fronteira aparecendo
sozinha. No caso do Prometheus, "nota" é mutável para o professor e imutável para a
secretaria, e foi essa divergência — mais do que qualquer razão técnica — que justificou
separar os contextos. Como vocês decidiram onde traçar as fronteiras no caso de vocês, pelo
vocabulário ou pela estrutura dos módulos?

**Modelo B — se o colega falou de requisitos ambíguos:**

Gostei da abordagem, e concordo que insistir em documento detalhado antes de começar
raramente funciona. Um complemento: quando a ambiguidade está num domínio de suporte, dá
para implementar a versão simples e revisar depois, mas num domínio core vale travar e
resolver antes, porque errar a fronteira ali é caro de desfazer. Essa distinção me ajudou a
decidir onde investir tempo de análise. Vocês usaram alguma técnica de descoberta com os
stakeholders, tipo Event Storming, ou foi mais por entrevista tradicional?
