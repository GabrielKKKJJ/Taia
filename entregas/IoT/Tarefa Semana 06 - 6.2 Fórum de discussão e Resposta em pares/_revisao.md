# Revisão — 6.2 Fórum de discussão e Resposta em pares (IoT, Semana 6)

**Veredito:** APROVADO COM RESSALVAS
**Revisado em:** 2026-08-23 12:39

## Cobertura do enunciado

| # | O que foi pedido | Situação | Onde está / o que falta |
|---|---|---|---|
| 1 | **D1** — Escolher entre Wokwi e Tinkercad sem hardware | Atende | `post-forum.md:12-13`: escolhe o Wokwi e condiciona a escolha ao objetivo, o que é mais defensável do que uma resposta seca |
| 2 | **D1** — Descrever características do Tinkercad | Atende | `post-forum.md:15-20`: origem Autodesk, montagem em protoboard visual, multímetro simulado, foco em Arduino Uno, ausência de conectividade |
| 3 | **D1** — Descrever características do Wokwi | Atende | `post-forum.md:22-28`: ESP32, Wi-Fi simulado até publicação MQTT real, bibliotecas do ecossistema Arduino, `diagram.json` versionável, compartilhamento por link |
| 4 | **D2** — Plataformas profissionais além de TagoIO e Blynk | Atende | `post-forum.md:40-60`: AWS IoT Core, Azure IoT Hub, ThingsBoard, Losant e Particle — cinco, acima do que a pergunta exige |
| 5 | **D2** — Justificar por que são "profissionais" | Atende | `post-forum.md:62-66`: o critério é o que muda com escala (identidade por dispositivo, provisionamento em lote, OTA, revogação de credencial). Boa resposta, porque é critério e não lista |
| 6 | Resposta em pares D1: debater diferenças Wokwi contra Tinkercad | Atende | `post-forum.md:75-82` (Modelo A) |
| 7 | Resposta em pares D2: debater TagoIO contra Blynk | Parcial | `post-forum.md:84-91` (Modelo B) parte de TagoIO ou Blynk, mas puxa para as plataformas profissionais em vez de comparar as duas entre si, que é o que o enunciado pede |
| 8 | Responder a um colega em 2 ou 3 frases | Atende | Cada modelo tem 3 frases |
| 9 | Acrescentar detalhe da própria pesquisa | Atende | Modelo A traz o limite de conectividade; Modelo B traz provisionamento em lote e OTA |
| 10 | Pedir mais detalhes ao par | Atende | Ambos terminam com pergunta direta ao colega |
| 11 | Mínimo de 30 palavras na resposta | Atende | Modelo A tem cerca de 75 palavras; Modelo B, cerca de 80 |
| 12 | Escrever com as próprias palavras, sem copiar da internet | Atende | Texto autoral, com observações que não vêm de material promocional (ex.: o `diagram.json` versionável no Git) |
| 13 | Formato `discussion_topic`, texto para colar no Canvas | Atende | `entrega/post-forum.md`, sem `.docx` — correto para este tipo |
| 14 | Prazo (2026-08-24 02:59Z) | Atende | Ainda no prazo em 23/08 |

## Problemas encontrados

### 1. O Modelo B não faz o debate que o enunciado pede — [IMPORTANTE]
- **Onde:** `entrega/post-forum.md:84-91`
- **Problema:** a Discussão 2 da resposta em pares é "Debatam entre os pares sobre as plataformas TagoIO e Blynk" — ou seja, comparar as duas entre si. O Modelo B menciona o TagoIO de passagem ("já entregar painel pronto") e imediatamente desloca o assunto para as plataformas profissionais do post inicial. Blynk não é sequer citado no modelo. A resposta é boa, mas responde a outra pergunta.
- **Correção:** acrescentar uma frase que contraste efetivamente as duas: o Blynk nasceu voltado ao app móvel e ao controle do dispositivo pelo celular, enquanto o TagoIO é mais orientado a dashboard, análise de dados e regras — daí o Blynk parecer mais direto para quem quer um controle remoto e o TagoIO para quem quer monitorar uma frota. Só então puxar para a pergunta sobre a ponte entre protótipo e produção.

### 2. "Trabalha essencialmente com Arduino Uno" subestima o Tinkercad — [MENOR]
- **Onde:** `entrega/post-forum.md:18-19`
- **Problema:** o Tinkercad Circuits também simula o micro:bit e o ATtiny, além do Arduino Uno. A palavra "essencialmente" salva a frase de estar errada, mas se um colega apontar o micro:bit no fórum, a resposta fica na defensiva sem necessidade.
- **Correção:** trocar por "trabalha com um catálogo pequeno de placas — Arduino Uno, micro:bit, ATtiny — e componentes discretos". O argumento central (nenhuma delas tem conectividade de rede) continua valendo e fica mais forte por ser mais preciso.

### 3. Meta-instruções misturadas ao texto a ser colado — [MENOR]
- **Onde:** `entrega/post-forum.md:1-5`, `70-75`, `84`
- **Problema:** o arquivo mistura o texto do fórum com títulos de parte ("PARTE 1 — Post inicial"), a nota de formato em blockquote e os rótulos "Modelo A" e "Modelo B" com suas condições ("se o colega defendeu o Tinkercad"). Nada disso pode ir para o Canvas.
- **Correção:** colar apenas o conteúdo das Discussões 1 e 2 no post inicial e, depois de ver as respostas dos colegas, escolher um modelo, adaptar e postar sem o rótulo.

### 4. Ordem de postagem — [MENOR]
- **Onde:** procedimento de envio
- **Problema:** o enunciado avisa que só é possível ver as mensagens dos colegas depois de publicar a resposta inicial. Os dois modelos são condicionais e presumem o que o colega escreveu.
- **Correção:** postar primeiro o post inicial, ler o que foi publicado, e só então adaptar o modelo mais próximo. É um passo de processo, não de conteúdo.

## Riscos de fabricação

**Nenhum.** Não há número, medição, saída de terminal ou captura apresentada como observada. As afirmações factuais foram conferidas e estão corretas:

- Tinkercad Circuits é da Autodesk — correto.
- Tinkercad não tem conectividade de rede nem suporte a ESP32 — correto.
- Wokwi suporta ESP32 com Wi-Fi simulado, permitindo publicação MQTT para um broker real — correto.
- Wokwi aceita bibliotecas do ecossistema Arduino, com o mesmo código migrando para o hardware físico — correto.
- Wokwi descreve o circuito em `diagram.json`, com entradas por componente e por fio, versionável e compartilhável por link — correto, e é uma observação de quem de fato usou a ferramenta.
- AWS IoT Core e o Device Shadow como cópia do estado do dispositivo na nuvem, sincronizada na reconexão — correto.
- Azure IoT Hub e IoT Edge empurrando processamento para o gateway local — correto.
- ThingsBoard é open source, auto-hospedável, com MQTT, CoAP e HTTP — correto.
- Losant e Particle em posicionamento intermediário — descrição defensável.
- A ressalva de que simulador reproduz lógica e não física (mau contato, ruído, queda de tensão, alcance de antena) — correta e é o melhor parágrafo do post.

A expressão "milhões de dispositivos conectados" sobre o AWS IoT Core é ordem de grandeza declarada pelo próprio fornecedor, não um número medido pelo aluno, e o texto não a apresenta como medição própria.

## Conclusão

Entrega sólida: as duas discussões estão respondidas, o mínimo de 30 palavras é largamente superado, tudo que é afirmado como fato técnico confere, e não há nenhum dado inventado. O ajuste que vale fazer antes de postar é no Modelo B, que deveria comparar TagoIO e Blynk entre si em vez de mudar de assunto. Depois disso, é limpar as marcações de rascunho e colar.
