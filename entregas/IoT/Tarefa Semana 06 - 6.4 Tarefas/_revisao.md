# Revisão — Tarefa Semana 06 · 6.4 Tarefas (Hello World no Wokwi)

**Veredito:** REPROVADO
**Revisado em:** 2026-08-23 13:13 (UTC-3) — 2ª rodada

> 1ª rodada: REPROVADO (1 bloqueante). Esta revisão confere apenas a correção e o que ela
> possa ter introduzido.

## Cobertura do enunciado

| # | O que foi pedido | Situação | Onde está / o que falta |
|---|---|---|---|
| 1 | *Hello world* na plataforma Wokwi | Atende | `entrega/wokwi/sketch.ino` + `diagram.json`, conferidos pino a pino na 1ª rodada |
| 2 | Explicar como funciona o ambiente | Atende | `relatorio.md` §2, §2.1, §7 |
| 3 | Rubrica — clareza e consistência | Atende | 9 seções, sem contradição interna no `.md` |
| 4 | Rubrica — relevância à semana 6 | Atende | §2, §7 e a comparação Wokwi × Tinkercad |
| 5 | Rubrica — evidência de conhecimento | Atende | Lei de Ohm (§3), `millis()` × `delay()` (§4), 5 referências |
| 6 | Formato `online_text_entry` | **Não atende** | O `.docx` entregue é a versão **anterior** à correção (ver problema 1) |

## Problemas encontrados

### 1. A correção não chegou ao `.docx` — o arquivo entregue ainda traz o heap inventado — [BLOQUEANTE]
- **Onde:** `entrega/Tarefa Semana 06 - IoT.docx` (mtime 12:34) × `entrega/relatorio.md` (mtime 12:45)
- **Problema:** o `relatorio.md` foi corrigido corretamente — §1 agora diz "o formato da saída no
  monitor serial", a §5 mudou de "Saída esperada" para "Formato da saída no monitor serial", os três
  valores viraram marcadores (`<modelo reportado pelo chip>`, `<valor reportado> MHz`,
  `<valor reportado pelo chip> bytes`) e há o parágrafo explicando que são lidos em tempo de
  execução. **O `.docx` não foi regerado.** Texto extraído do documento entregue: "Este documento traz
  o circuito, o código comentado, **a saída obtida**...", "5. Saída esperada no monitor serial",
  "Chip: ESP32-D0WDQ6 / Frequencia da CPU: 240 MHz / **Memoria livre: 298764 bytes**". Como o formato
  aceito é `online_text_entry`, é esse documento que o professor lê: o bloqueante da 1ª rodada
  continua integralmente na entrega.
- **Correção:** regerar o `.docx` a partir do `relatorio.md` corrigido e reconferir o texto extraído
  (busca por "298764" e por "saída obtida" tem de voltar vazia).

### 2. Trecho de código citado ainda não bate com o arquivo — [MENOR] *(pendente da 1ª rodada)*
- **Onde:** `relatorio.md:106-108` × `wokwi/sketch.ino:36-43`
- **Problema:** o relatório continua citando `Serial.print("Frequencia: "); Serial.println(ESP.getCpuFreqMHz());`
  e `Serial.print("Memoria livre: ");Serial.println(ESP.getFreeHeap());`. No sketch o rótulo é
  `"Frequencia da CPU: "` e a impressão é `print(valor)` + `println(" MHz")` / `println(" bytes")`.
  Agora a divergência ficou mais visível, porque a §5 corrigida usa o rótulo certo.
- **Correção:** colar as três linhas literalmente do `sketch.ino` ou declarar que é versão condensada.

### 3. O sketch completo não chega ao professor — [IMPORTANTE] *(pendente da 1ª rodada)*
- **Onde:** `relatorio.md` × `_contexto/meta.json` (`online_text_entry`)
- **Problema:** o documento entregue traz apenas recortes de 4 e 3 linhas. Não há upload de arquivo
  neste formato, então o firmware — o artefato pedido — não é visto por quem corrige.
- **Correção:** anexo ao fim do relatório com `sketch.ino` e `diagram.json` na íntegra, ou link
  público do projeto no Wokwi.

### 4. Resíduo de redação em §6 — [MENOR]
- **Onde:** `relatorio.md:142`
- **Problema:** "o monitor serial exibe a saída acima". Como a §5 agora é declaradamente um *formato*
  com marcadores, a frase ficou ambígua.
- **Correção:** "o monitor serial exibe uma saída com esse formato".

## Riscos de fabricação

- `relatorio.md`: **nenhum**. Os três valores do chip são marcadores explícitos e o parágrafo
  introdutório da §5 declara que são lidos em tempo de execução. As linhas `[1s] ciclo 1 | LED ACESO`
  são derivadas deterministicamente de `sketch.ino:56-61` com `INTERVALO = 1000`.
- `Tarefa Semana 06 - IoT.docx`: **FABRICADO** — `Memoria livre: 298764 bytes` e `Chip: ESP32-D0WDQ6`
  seguem no documento entregue, sob a frase "a saída obtida". O arquivo é anterior à correção.

## Conclusão

O texto-fonte está corrigido e honesto; o arquivo que vai ao professor, não. Como a entrega é só
texto, o `.docx` desatualizado carrega o mesmo valor de heap inventado que reprovou na 1ª rodada —
por isso o veredito não muda. Regerar o documento fecha o bloqueante em um comando. Aproveitar para
alinhar o trecho de código da §4 e anexar o sketch completo.

Prazo: hoje, 23/08/2026 às 23:59 (UTC-3).
