# Revisão — Tarefa Semana 06 · 6.4 Tarefas (Hello World no Wokwi)

**Veredito:** REPROVADO
**Revisado em:** 2026-08-23 12:40 (UTC-3)

## Cobertura do enunciado

| # | O que foi pedido | Situação | Onde está / o que falta |
|---|---|---|---|
| 1 | Desenvolver um *hello world* na plataforma Wokwi | Atende | `entrega/wokwi/sketch.ino` (serial + LED em GPIO 2) e `entrega/wokwi/diagram.json` (ESP32 + LED + resistor 220 Ω) |
| 2 | Explicar como funciona esse ambiente de desenvolvimento | Atende | `relatorio.md` §2 e §2.1 (papel de `sketch.ino` e `diagram.json`, formato `connections`), §7 (o que o simulador entrega e o que não entrega) |
| 3 | Rubrica — clareza e consistência | Atende | Texto estruturado em 9 seções, sem contradições internas exceto o item 1 dos problemas |
| 4 | Rubrica — relevância do conteúdo (semana 6: estruturas, IDEs e ferramentas de IoT) | Atende | §2, §7 e a comparação Wokwi × Tinkercad conversam diretamente com o tema da semana e com o fórum 6.2 |
| 5 | Rubrica — evidência de conhecimento (exemplos, referências) | Atende | Cálculo do resistor pela lei de Ohm (§3), justificativa de `millis()` × `delay()` (§4), 5 referências (§9) |
| 6 | Rubrica — resposta aos colegas | Não aplicável | Critério do fórum 6.2, não desta tarefa; fora de escopo aqui |
| 7 | Formato de entrega (`online_text_entry`) | Atende | `Tarefa Semana 06 - IoT.docx` gerado a partir do `relatorio.md`, com a Figura 1 renderizada |

## Problemas encontrados

### 1. Saída do monitor serial apresentada como executada — [BLOQUEANTE]
- **Onde:** `entrega/relatorio.md:10` ("Este documento traz o circuito, o código comentado, **a saída obtida**"), `entrega/relatorio.md:118-130`, `entrega/relatorio.md:138` ("o monitor serial exibe a saída acima")
- **Problema:** nenhuma simulação foi executada e não há nenhum arquivo na pasta (log, captura, export) que sustente essa saída. O título da §5 diz "Saída **esperada**", o que estaria correto, mas §1 e §6 afirmam que a saída foi **obtida**. Somado a isso, o bloco traz um valor exato e não derivável do código — `Memoria livre: 298764 bytes` — que só poderia vir de uma execução real. O `.docx` entregue carrega as duas frases (verificado no texto extraído do documento).
- **Correção:** ou rodar a simulação no Wokwi e colar a saída real (de preferência com captura em `entrega/assets/`), ou trocar "a saída obtida" por "a saída esperada" em §1, ajustar §6 para "deve exibir uma saída como a acima" e substituir o valor de heap por algo declaradamente ilustrativo (ex.: `Memoria livre: <valor do heap no boot> bytes`).

### 2. Trecho de código citado não bate com o arquivo — [MENOR]
- **Onde:** `entrega/relatorio.md:105-109` × `entrega/wokwi/sketch.ino:36-43`
- **Problema:** o relatório cita `Serial.print("Frequencia: "); Serial.println(ESP.getCpuFreqMHz());`, mas o sketch usa `Serial.print("Frequencia da CPU: ");` seguido de `Serial.print(...)` e `Serial.println(" MHz");`. O mesmo vale para a linha da memória (`print` + `" bytes"`, não `println`). O rótulo citado nem sequer coincide com o que aparece na própria §5 do relatório ("Frequencia da CPU: 240 MHz").
- **Correção:** copiar as três linhas literalmente do `sketch.ino`, ou dizer explicitamente que o trecho é uma versão condensada.

### 3. O sketch completo não chega ao professor — [IMPORTANTE]
- **Onde:** `entrega/relatorio.md` (só há trechos em §2.1, §4) / `Tarefa Semana 06 - IoT.docx`
- **Problema:** o formato aceito é apenas `online_text_entry` (`_contexto/meta.json:11-13`) — não há upload de arquivo. O `sketch.ino` e o `diagram.json` existem na pasta, mas o documento entregue traz somente recortes de 4 e 3 linhas. Quem corrige não vê o firmware inteiro, que é justamente o artefato pedido ("desenvolva ... um hello world").
- **Correção:** acrescentar um anexo no fim do relatório com o conteúdo integral de `wokwi/sketch.ino` e de `wokwi/diagram.json` (ou, no mínimo, o link público do projeto no Wokwi).

### 4. Verificações que passaram (registro) — [—]
- Pino a pino, código × circuito: `PINO_LED = 2` (`sketch.ino:12`) ↔ `["esp:2","r1:1"]`, `["r1:2","led1:A"]`, `["led1:C","esp:GND.1"]` (`diagram.json:23-25`). Nenhum pino com uso duplicado; `diagram.json` é JSON válido; chaves e parênteses do `.ino` balanceados (não há compilador Arduino neste ambiente para build completo).
- Números: resistor 220 Ω no relatório = 220 Ω no `diagram.json`; `R = (3,3−2,0)/0,02 ≈ 65 Ω` confere; `≈ 6 mA` confere ((3,3−2,0)/220 = 5,9 mA); `115200` no texto = `Serial.begin(115200)`.
- O bloco `connections` citado em §2.1 bate literalmente com o arquivo.

## Riscos de fabricação

- `relatorio.md:124` — `Memoria livre: 298764 bytes`: **FABRICADO**. Valor exato de heap, sem origem rastreável em nenhum arquivo da pasta, apresentado sob a afirmação "a saída obtida" (§1).
- `relatorio.md:122` — `Chip: ESP32-D0WDQ6`: risco moderado. É o chip plausível da placa simulada, mas também é apresentado como leitura real sem evidência.
- `relatorio.md:126-129` — linhas `[1s] ciclo 1 | LED ACESO ...`: baixo risco. São derivadas deterministicamente do `sketch.ino:56-61` e do intervalo de 1000 ms; ainda assim herdam o rótulo errado de §1.

## Conclusão

O trabalho em si está correto: circuito coerente com o código, cálculo elétrico certo, explicação do ambiente bem alinhada à semana 6. O que reprova é uma questão de honestidade de rótulo — o documento diz que traz "a saída obtida" e exibe um valor de memória que ninguém mediu. A correção é de dois minutos: trocar duas frases e marcar o valor de heap como ilustrativo, ou rodar a simulação e colar a saída real. Feito isso, vale acrescentar o código integral em anexo, já que a entrega é só texto.

Prazo: hoje, 23/08/2026 às 23:59 (UTC-3) — ainda não venceu, mas há poucas horas de margem.
