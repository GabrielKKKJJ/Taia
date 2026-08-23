# Revisão — 7.2 Fórum de discussão e Resposta em pares (IoT, Semana 7)

**Veredito:** APROVADO COM RESSALVAS
**Revisado em:** 2026-08-23 12:39

## Cobertura do enunciado

| # | O que foi pedido | Situação | Onde está / o que falta |
|---|---|---|---|
| 1 | **D1** — Tecnologias que apoiam o avanço da IoT | Atende | `post-forum.md:12-38`: cinco blocos — LPWAN e 5G, computação de borda, microcontroladores baratos, bancos de série temporal, e padronização de segurança |
| 2 | **D1** — Descrever, não só listar | Atende | Cada bloco explica o gargalo que resolve. O de borda (`:22-25`) é o mais bem construído: latência, custo de tráfego e funcionamento com a nuvem fora do ar |
| 3 | **D2** — Como combinar IoT e IA | Atende | `post-forum.md:42-44`: a IoT gera volume e continuidade, a IA converte em decisão. Fecha em `:65-68` com o critério que amarra tudo, sair do limiar fixo para o padrão aprendido |
| 4 | **D2** — Citar exemplos | Atende | Quatro exemplos: manutenção preditiva, agricultura de precisão, visão computacional embarcada, detecção de anomalia em consumo |
| 5 | Resposta em pares D1: casos reais de IoT com IA e BigData | Atende | `post-forum.md:76-83` (Modelo A): argumenta que o diferencial é o histórico longo por equipamento, não a IA em si |
| 6 | Resposta em pares D2: uso de IoT em fazendas conectadas | Atende | `post-forum.md:85-91` (Modelo B): irrigação por setor mais a questão de conectividade rural com LoRaWAN |
| 7 | Responder a um colega em 2 ou 3 frases | Atende | Cada modelo tem 3 frases |
| 8 | Acrescentar detalhe da própria pesquisa | Atende | Ambos trazem informação que não estava no post do colega |
| 9 | Pedir mais detalhes ao par | Atende | Modelo A pergunta sobre custo de armazenamento; Modelo B, sobre manutenção de sensores em campo. As duas perguntas são boas, porque não têm resposta óbvia |
| 10 | Mínimo de 30 palavras na resposta | Atende | Modelo A tem cerca de 80 palavras; Modelo B, cerca de 75 |
| 11 | Escrever com as próprias palavras, sem copiar da internet | Atende | Texto autoral e argumentativo, não enumerativo |
| 12 | Formato `discussion_topic`, texto para colar no Canvas | Atende | `entrega/post-forum.md`, sem `.docx` — correto para este tipo |
| 13 | Prazo (2026-08-24 02:59Z) | Atende | Ainda no prazo em 23/08 |

## Problemas encontrados

### 1. Sigfox citado no presente sem ressalva — [MENOR]
- **Onde:** `entrega/post-forum.md:15-16`
- **Problema:** a frase "As redes LPWAN — LoRaWAN, NB-IoT, Sigfox — mudaram a equação" trata as três como igualmente vigentes. A Sigfox operadora entrou em recuperação judicial em 2022 e foi adquirida pela Unabiz; a tecnologia segue existindo, mas citá-la lado a lado com LoRaWAN e NB-IoT como aposta atual é discutível e um colega bem informado pode cobrar.
- **Correção:** ou remover a Sigfox da tríade, ou acrescentar meia frase: "a Sigfox, hoje sob a Unabiz depois da crise da operadora original, mostra também o risco de depender de uma rede proprietária de operador único". Vira um argumento a favor da tese, em vez de uma vulnerabilidade.

### 2. "Dura anos com uma bateria" apresentado sem faixa — [MENOR]
- **Onde:** `entrega/post-forum.md:16-18`
- **Problema:** a afirmação está correta na ordem de grandeza, mas depende inteiramente do ciclo de transmissão, do tamanho do payload e da classe do dispositivo. Como está, soa a número de folheto. Não é fabricação — não há medição atribuída a experimento próprio — mas é o tipo de afirmação que fica melhor qualificada.
- **Correção:** "dura anos com uma bateria quando transmite poucas mensagens por dia e passa o resto do tempo dormindo; com ciclo de transmissão agressivo, essa autonomia cai para meses". A condição é justamente o que demonstra entendimento.

### 3. Quinto item fora da pergunta, embora bem colocado — [MENOR]
- **Onde:** `entrega/post-forum.md:36-38`
- **Problema:** a pergunta é sobre tecnologias que apoiam o avanço da IoT, e o texto acrescenta "padronização de segurança", reconhecendo ele mesmo que "não é tecnologia". A observação é pertinente e o parágrafo é bom, mas é acréscimo fora do escopo estrito.
- **Correção:** nenhuma obrigatória. Se quiser deixá-lo dentro da pergunta, basta reformular como tecnologia concreta: provisionamento com certificado por dispositivo, boot seguro e atualização assinada — que são tecnologias, e cobrem a mesma preocupação.

### 4. Meta-instruções misturadas ao texto a ser colado — [MENOR]
- **Onde:** `entrega/post-forum.md:1-6`, `72-76`, `85`
- **Problema:** o arquivo mistura o conteúdo do fórum com títulos de parte, a nota sobre o mínimo de palavras em blockquote e os rótulos "Modelo A" e "Modelo B" com suas condições. Nada disso pode ir para o Canvas.
- **Correção:** colar apenas o conteúdo das Discussões 1 e 2 no post inicial e, depois de ler os colegas, escolher um modelo, adaptar e postar sem o rótulo.

## Riscos de fabricação

**Nenhum.** Não há número, medição, saída de terminal, captura ou gráfico apresentado como observado pelo aluno. As afirmações factuais foram conferidas e estão corretas:

- LoRaWAN, NB-IoT e Sigfox como tecnologias LPWAN, com alcance de quilômetros e baixo consumo — correto (sobre a Sigfox, ver o problema 1).
- 5G com fatiamento de rede (network slicing) e baixa latência para casos como veículo autônomo — correto.
- Computação de borda reduzindo latência, custo de tráfego e mantendo operação com a nuvem indisponível — correto.
- ESP32 com dois núcleos, Wi-Fi e Bluetooth integrados, a poucos dólares — correto.
- InfluxDB e TimescaleDB como bancos de série temporal, com agregação contínua e política de retenção — correto; downsampling e retention policies são recursos nativos de ambos.
- Manutenção preditiva por assinatura de vibração captada por acelerômetro antecipando falha de rolamento — correto, e é de fato o caso mais consolidado do setor.
- Inferência embarcada enviando só o resultado e não o vídeo, com ganho de banda e de privacidade — correto.
- Medidores inteligentes com detecção de anomalia para vazamento e furto — correto.
- A distinção entre limiar fixo e padrão aprendido, com o exemplo do pico normal de operação contra início de falha — correta e bem formulada.

## Conclusão

Entrega em bom estado: as duas discussões estão respondidas, a resposta em pares cobre os dois temas pedidos, o mínimo de 30 palavras é superado com folga e nada é apresentado como medido sem ter sido medido. As ressalvas são todas de precisão, não de conteúdo — qualificar a autonomia de bateria e resolver a menção à Sigfox. Depois disso, é limpar as marcações de rascunho e colar no Canvas.
