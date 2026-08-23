# Revisão — Lab Semana 07 · B.7 (Protótipo de cidade inteligente)

**Veredito:** REPROVADO
**Revisado em:** 2026-08-23 12:40 (UTC-3)

## Cobertura do enunciado

### Atividade #1 — Protótipo de automação contextual

| # | O que foi pedido | Situação | Onde está / o que falta |
|---|---|---|---|
| 1 | Plataforma de simulação: Wokwi | Atende | `entrega/wokwi/diagram.json` + `sketch.ino` + `libraries.txt` no formato do Wokwi |
| 2 | Microcontrolador ESP32 | Atende | `diagram.json:6` -> `board-esp32-devkit-c-v4` |
| 3 | Sensores LDR, DHT22, HC-SR04 | Atende | `diagram.json:7-9`; lidos em `sketch.ino:81-84` |
| 4 | Atuadores: LEDs vermelho, verde, azul + buzzer | Atende | `diagram.json:10-13`; acionados em `sketch.ino:130-136` |
| 5 | Saída em LCD 16x2 **ou** monitor serial | Atende | Os dois: `mostrarLcd()` e `mostrarSerial()` (`sketch.ino:139-165`) |
| 6 | Circuito funcional entradas -> processamento -> saídas | Atende | `diagram.json` fecha alimentação e sinal de todos os componentes; conferência pino a pino no problema 5 |
| 7 | Regra: luz < 300 **e** temp > 30 °C -> LED azul + LED verde | Atende | `sketch.ino:105-109`, limiares em `sketch.ino:30-31` |
| 8 | Regra: distância < 30 cm -> LED vermelho + buzzer | Atende | `sketch.ino:112-115`; `aplicar()` liga vermelho e `tone()` juntos |
| 9 | Regra: temp > 35 °C **e** umidade < 40 % -> alerta combinada | Atende | `sketch.ino:118-122` (alerta + ventilação, estado `ALERTA SECA`) |
| 10 | Mostrar valores lidos e estado do sistema | Atende | LCD linha 1 = leituras, linha 2 = estado; serial imprime as 4 leituras + estado + os 3 atuadores |
| 11 | Estruturar em funções claras e comentadas | Atende | 6 funções nomeadas por papel (`lerDistancia`, `lerSensores`, `decidir`, `aplicar`, `mostrarLcd`, `mostrarSerial`), comentadas |
| 12 | Simular pelo menos 3 cenários urbanos | Parcial | `relatorio.md` §7 define 3 cenários com ajuste de sensores e resposta **esperada**; nenhuma simulação foi executada e não há evidência de execução |
| 13 | Entregável: link do projeto no Wokwi | **Não atende** | Marcado como pendência em `relatorio.md:251` — e a pendência é removida do `.docx` entregue (ver problema 2) |
| 14 | Entregável: código funcional no GitLab **ou** em PDF | Parcial | Não há repositório; o relatório traz apenas o trecho `decidir()`. O `sketch.ino` completo não entra no documento |
| 15 | Entregável: capturas de tela do circuito e dos resultados | **Não atende** | Pendência em `relatorio.md:254`; `entrega/assets/` contém só a Figura 1 (diagrama de blocos renderizado) |
| 16 | Entregável: requisitos funcionais e não funcionais | Atende | §5.1 (RF1-RF6) e §5.2 (RNF1-RNF6, com categoria) |
| 17 | Entregável: pelo menos 3 histórias de usuário | Atende | §6 — HU1 pedestre, HU2 operador de trânsito, HU3 técnico de manutenção |
| 18 | Entregável: critérios de aceitação para cada história | Atende | 2 critérios por história, no formato Dado/Quando/Então, verificáveis contra o código |
| 19 | Relatório técnico: diagrama do sistema | Atende | §2 + `assets/diagrama1.png` (pinos do diagrama batem com o código) |
| 20 | Relatório técnico: lógica de controle | Atende | §3, incluindo precedência entre regras e tratamento de `NaN` |
| 21 | Relatório técnico: tabela de condições e respostas | Atende | §4, 5 linhas, coerente com `decidir()` |
| 22 | Relatório técnico: considerações de segurança física | Atende | §8 — resistores, nível de 5 V do ECHO, corrente agregada dos GPIOs, ruído, invólucro |
| 23 | Relatório técnico: reflexão sobre aplicações reais | Atende | §9 — iluminação adaptativa, risco ambiental, segurança viária, com limitação assumida |
| 24 | Relatório técnico **em PDF** | Parcial | Entregue em `.docx` (`Lab Semana 07 - IoT.docx`); falta exportar para PDF |

### Atividade #2 — Análise preditiva e comunicação MQTT

| # | O que foi pedido | Situação | Onde está / o que falta |
|---|---|---|---|
| 25 | Processar CSV (médias móveis, tendências) em Python/notebook | **Não atende** | Nenhum `.py`, `.ipynb` ou CSV na pasta |
| 26 | Regras de inferência (superaquecimento, seca) | **Não atende** | Ausente |
| 27 | Visualizações + exportação em JSON | **Não atende** | Ausente |
| 28 | Publicar/assinar `/iot/alertas` via MQTT com ESP32 | **Não atende** | Ausente; o `sketch.ino` não usa rede |
| 29 | Proposta de segurança MQTT (autenticação, TLS, gestão de tópicos) | **Não atende** | Ausente |
| 30 | Relatório técnico da atividade #2 (regras, fluxo, segurança, reflexões) | **Não atende** | Ausente |

## Problemas encontrados

### 1. A Atividade #2 do enunciado não foi entregue — [BLOQUEANTE]
- **Onde:** `_contexto/enunciado.md:151-259` × `entrega/`
- **Problema:** o enunciado desta tarefa (assignment 24826, 29 pts) tem **duas** atividades obrigatórias, cada uma com entregáveis e rubrica próprios. A pasta cobre integralmente a #1 e não tem nada da #2 (análise de CSV em Python, regras preditivas, JSON, publicação MQTT, segurança em MQTT). Não é item opcional nem alternativa "X ou Y". Também não existe outra pasta em `entregas/IoT/` cobrindo essa parte.
- **Correção:** produzir o notebook ou `.py` com pandas + matplotlib sobre um CSV simulado, os sketches publisher/subscriber MQTT e a seção de segurança; ou, se a #2 for entregue em outra rodada, registrar isso explicitamente no relatório para o corretor não ler como omissão.

### 2. Entregáveis obrigatórios ausentes, e a ausência some do documento entregue — [BLOQUEANTE]
- **Onde:** `relatorio.md:251-255`, `_pendencias.md`, `Lab Semana 07 - IoT.docx`
- **Problema:** o "Link do projeto no Wokwi" e as "Capturas de tela do circuito e dos resultados" são entregáveis explícitos e estão pendentes. Os marcadores `[PENDENTE: ...]` no `relatorio.md` são honestos — o problema é o `.docx`: extraí o texto do documento e a palavra "PENDENTE" não aparece nenhuma vez; a seção 10 termina em "Clicar em Play e ajustar os sensores conforme a tabela da seção 7". O corretor recebe um relatório que descreve três cenários de validação sem link, sem captura e sem nenhuma indicação de que faltam — o que se lê como entrega completa.
- **Correção:** publicar o projeto no Wokwi, colar o link e anexar as capturas dos três cenários (LCD + monitor serial). Enquanto isso não acontecer, o `.docx` precisa carregar a ressalva em vez de escondê-la.

### 3. O código completo não chega ao corretor — [IMPORTANTE]
- **Onde:** `relatorio.md:82-105` × `entrega/wokwi/sketch.ino` (203 linhas)
- **Problema:** o entregável é "código funcional no GitLab **ou** em PDF". Não há GitLab, e o documento traz apenas a função `decidir()` (23 linhas). O restante — leitura dos sensores, `lerDistancia()`, `aplicar()`, saídas, `setup()` e `loop()` — não está em nada do que se entrega. A rubrica de "Implementação funcional" pede código completo.
- **Correção:** anexar `sketch.ino` e `diagram.json` na íntegra ao fim do relatório (o formato aceita `online_upload`, então os arquivos também podem ir junto), ou publicar num repositório e citar o link.

### 4. Trecho de código citado não é literal — [MENOR]
- **Onde:** `relatorio.md:82-105` × `sketch.ino:96-125`
- **Problema:** identificadores, limiares e ordem das regras batem, mas o trecho foi condensado: `if (!l.valida) { a.estado = "ERRO SENSOR"; return a; }` numa linha (são 4 no arquivo), atribuições agrupadas na mesma linha e comentários encurtados ("Regra 3 - calor seco, tem precedencia" no relatório × "Regra 3 - calor seco: risco de incendio, tem precedencia sobre as demais." no arquivo).
- **Correção:** colar o trecho exatamente como está no arquivo, ou avisar que é versão resumida.

### 5. Conferência pino a pino: aprovada (registro) — [—]
- **Onde:** `sketch.ino:18-25` × `diagram.json:19-51`

| Uso no código | GPIO | Ligação no diagrama | Confere |
|---|---|---|---|
| `PINO_LDR` (`analogRead`) | 34 | `ldr1:AO -> esp:34`, LDR em 3V3/GND | Sim — GPIO 34 é ADC1_CH6 e *input-only*; fora do ADC2, que conflita com o Wi-Fi |
| `PINO_DHT` | 15 | `dht1:SDA -> esp:15`, DHT em 3V3/GND | Sim |
| `PINO_TRIG` / `PINO_ECHO` | 5 / 18 | `ultra1:TRIG -> esp:5`, `ultra1:ECHO -> esp:18`, VCC em 5V | Sim |
| LED azul / verde / vermelho | 2 / 4 / 19 | Cada um via resistor de 220 Ω até o ânodo, cátodo em `GND.2` | Sim |
| `PINO_BUZZER` (`tone`) | 13 | `esp:13 -> bz1:1`, `bz1:2 -> GND.2` | Sim |
| LCD I2C (implícito na biblioteca) | 21 SDA / 22 SCL | `esp:21 -> lcd1:SDA`, `esp:22 -> lcd1:SCL` | Sim — I2C padrão do ESP32, livre porque o buzzer foi para o 13 |

- Contagem automática das conexões: 25 fios, JSON válido, e **nenhum pino de sinal aparece duas vezes** (34, 15, 5, 18, 2, 4, 19, 13, 21, 22 — uma ocorrência cada; repetem-se apenas `3V3`, `5V` e os três `GND`, como esperado). Chaves e parênteses do `.ino` balanceados e todas as funções definidas antes do uso (não há toolchain Arduino neste ambiente para um build completo).
- `libraries.txt` cobre os dois `#include`: `DHT.h` -> "DHT sensor library", `LiquidCrystal_I2C.h` -> "LiquidCrystal I2C", mais "Adafruit Unified Sensor", dependência da primeira. Nada falta e nada sobra.
- Números do relatório conferidos contra o código: limiares 300 / 30 °C / 35 °C / 40 % / 30 cm idênticos a `sketch.ino:30-34`; ciclo de 2 s = `INTERVALO_LEITURA = 2000`; resistores de 220 Ω = `diagram.json:15-17`; "corrente em torno de 6 mA" confere ((3,3 − 2,0)/220 = 5,9 mA); fator 0,0343 cm/µs com divisão por 2 no HC-SR04 correto; endereço 0x27 do LCD = `LiquidCrystal_I2C lcd(0x27, 16, 2)`.

### 6. Atribuição de conteúdo à semana errada — [MENOR]
- **Onde:** `relatorio.md:238`
- **Problema:** "publicar as leituras por MQTT — o que a semana 6 já cobriu". A semana 6 tratou de estruturas, IDEs e ferramentas de desenvolvimento (Wokwi, Tinkercad, TagoIO, Blynk); MQTT aparece lá como recurso de plataforma, não como conteúdo da semana. Pior: MQTT é exatamente o que a Atividade #2 **desta** tarefa exige, e o relatório o trata como trabalho futuro.
- **Correção:** remover a atribuição de semana e ligar o parágrafo à Atividade #2.

### 7. Três hipóteses do circuito não verificadas na simulação — [MENOR]
- **Onde:** `relatorio.md:189-193`, `diagram.json:13`, `diagram.json:45-48`
- **Problema:** como nada foi executado, seguem sem confirmação: (a) o sentido da leitura do `wokwi-photoresistor-sensor` — os cenários assumem que o valor do ADC **cresce** com a luz (150 no escuro, 900 no claro), o que precisa ser conferido no controle deslizante antes de afirmar resultados; (b) a polaridade do `wokwi-buzzer` (`bz1:1` no GPIO, `bz1:2` no GND); (c) o LCD alimentado em 3V3 — funciona no simulador, mas o backpack PCF8574 real costuma exigir 5 V, e a §8 discute o nível de 5 V do ECHO sem mencionar isso.
- **Correção:** confirmar (a) e (b) ao rodar a simulação — se o LDR for invertido, os cenários A e B trocam de valor — e acrescentar uma linha sobre a alimentação do LCD em §8.

## Riscos de fabricação

Nenhum resultado fabricado no `relatorio.md`. A §7 está corretamente rotulada como "Resposta **esperada**", a §4 é tabela de projeto e não de medição, e as duas lacunas reais (link do Wokwi e capturas) estão marcadas como `[PENDENTE: ...]`.

Ressalva importante: essa honestidade **não sobrevive à geração do `.docx`**. O documento entregue não contém a palavra "PENDENTE" e, sem os marcadores, a §7 passa a soar como validação realizada. Para quem corrige, o efeito é o mesmo de um resultado apresentado sem lastro — por isso o problema 2 é bloqueante.

## Conclusão

A Atividade #1 está tecnicamente sólida: circuito e código concordam pino a pino, o ADC está no ADC1, o I2C está livre, as bibliotecas cobrem os includes e todos os itens de documentação (requisitos, histórias, critérios de aceitação, tabela de condições, segurança física, reflexão) estão presentes. Não dá para entregar assim por duas razões: a Atividade #2 inteira está faltando, e os entregáveis "link do Wokwi" e "capturas de tela" somem do documento que vai ao professor, sem aviso. Antes de submeter: rodar a simulação e capturar os três cenários, publicar o link, anexar o código completo, exportar em PDF e produzir a Atividade #2. O prazo é hoje, 23/08 às 23:59 (UTC-3).
