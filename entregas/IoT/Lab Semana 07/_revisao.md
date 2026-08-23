# Revisão — Lab Semana 07 · B.7 (Cidade inteligente + análise preditiva com MQTT)

**Veredito:** REPROVADO
**Revisado em:** 2026-08-23 13:13 (UTC-3) — 2ª rodada

> 1ª rodada: REPROVADO (2 bloqueantes). O bloqueante 1 — Atividade #2 inteiramente ausente — está
> **fechado**. O bloqueante 2 — entregáveis obrigatórios ausentes e sumindo do `.docx` — **continua
> aberto**, agora também para a Atividade #2.

## Cobertura — Atividade #2 (foco desta rodada)

| # | O que foi pedido | Situação | Onde está / o que falta |
|---|---|---|---|
| 25 | Código em Python 3 ou notebook | Atende | `entrega/analise/analise_preditiva.py`, 251 linhas, estruturado em 7 funções |
| 26 | Bibliotecas pandas, numpy, matplotlib/plotly, paho-mqtt | Atende | Todas importadas (`numpy` importado e não usado — ver problema 3) |
| 27 | Dataset CSV de temperatura e umidade | Atende | `analise/dados/leituras.csv`: 1440 linhas + cabeçalho, 60 dias x 24 h, 2026-07-01 a 2026-08-29 — bate com o §10 |
| 28 | Processar: agrupar por data, médias móveis, tendências | Atende | `agregar_por_dia()` e `calcular_tendencias()` (rolling 3d, `diff`, contagem de sequência por `cumsum`) |
| 29 | Regra: temperatura subindo 3 dias -> superaquecimento | Atende | `aplicar_regras()`, `dias_subindo == DIAS_SUBIDA_ALERTA` (3) |
| 30 | Regra: temperatura alta + umidade baixa -> seca | Atende | `temp_max > 35` e `umid_min < 40`; o dataset contém o episódio (11 a 17/08: máximas de 39,3 a 42,4 C com mínimas de umidade de 42,2 a 31,6 %) |
| 31 | Gerar visualizações | Parcial | `gerar_graficos()` produz `saida/tendencias.png`; o arquivo não existe — o script não foi executado |
| 32 | Exportar como JSON | Parcial | `exportar_json()` produz `alertas.json` e `serie_diaria.json`; nenhum dos dois existe na pasta |
| 33 | Publicar em `/iot/alertas` via MQTT | Atende (código) | `publicar_alertas()` com `qos=1` em `test.mosquitto.org:1883` — mas ver problema 2 |
| 34 | Outro ESP32 assinar e reagir | Atende | `analise/esp32_assinante/sketch.ino` + `diagram.json`; assina com QoS 1 e aciona LED/buzzer por tipo de alerta |
| 35 | Segurança: autenticação, TLS, gestão de tópicos | Atende | §13.1 (usuário/senha e mTLS), §13.2 (`WiFiClientSecure`, `setCACert`, porta 8883, armadilha do `setInsecure()`), §13.3 (ACL do Mosquitto) |
| 36 | Relatório: regras preditivas, diagrama de fluxo, segurança, reflexão | Atende | §11, Figura 3 (§12), §13, §14 |
| 37 | Entregável: capturas da publicação e recepção MQTT | **Não atende** | `[PENDENTE]` em `relatorio.md:477`; nada em `assets/` — e o marcador some do `.docx` |
| 38 | Entregável: gráficos e arquivos JSON | **Não atende** | Idem; a pasta `analise/saida/` não existe |

Atividade #1 — cobertura inalterada em relação à 1ª rodada (itens 1 a 11 e 16 a 23 Atende; 12
Parcial; 13 e 15 Não atende; 14 e 24 Parcial). Nada regrediu.

### Conferências feitas nesta rodada

- **Assinante, pino a pino:** `PINO_VERDE=2`, `PINO_AMARELO=4`, `PINO_VERMELHO=19`, `PINO_BUZZER=13`
  (`sketch.ino:22-25`) contra `esp:2->r1->ledVerde`, `esp:4->r2->ledAmarelo`, `esp:19->r3->ledVermelho`,
  `esp:13->bz1` (`diagram.json:16-26`). Confere; três resistores de 220 ohms; JSON válido; nenhum pino
  repetido; cátodos e buzzer todos em `GND.2`.
- **`libraries.txt`** contém `PubSubClient` e `ArduinoJson`; os includes são `WiFi.h` (nativo do core
  ESP32), `PubSubClient.h` e `ArduinoJson.h`. Cobre e não sobra.
- **Código contra relatório:** os trechos citados na §11 e na §12 (`resample`, rolling/`cumsum`, as
  duas regras, o loop de cópia do payload, `setBufferSize(1024)`) batem com os arquivos.
- **Dataset contra relatório:** 1440 leituras, 60 dias, período e granularidade horária conferidos por
  contagem (24 linhas por dia, sem falha).
- **Não foi possível executar o Python** — não há interpretador nesta máquina (`python`, `py` e
  `python3` ausentes). A análise abaixo é estática.

## Problemas encontrados

### 1. Entregáveis obrigatórios ausentes, e a ausência não aparece no `.docx` — [BLOQUEANTE] (pendente da 1ª rodada, agora também na Atividade #2)
- **Onde:** `relatorio.md:474-478` e `492-496`, `_pendencias.md`, `Lab Semana 07 - IoT.docx`
- **Problema:** seguem faltando quatro entregáveis explícitos: link do projeto no Wokwi, capturas do
  circuito e dos cenários (Atividade #1), capturas da publicação e da recepção MQTT e os gráficos e
  JSON (Atividade #2). Os quatro marcadores `[PENDENTE]` no `relatorio.md` são honestos — mas o
  `.docx` foi regerado às 12:54, já com a Atividade #2, e a palavra "PENDENTE" não aparece nenhuma
  vez no texto extraído: a §15 termina em "Rodar o script Python em seguida faz os LEDs reagirem" e
  emenda direto na §16. O próprio `_pendencias.md` documenta o comportamento ("nao aparecem no .docx
  entregue"). Quem corrige recebe um relatório que descreve validação e publicação MQTT sem nenhuma
  evidência e sem nenhuma ressalva.
- **Correção:** rodar `analise_preditiva.py` (o Colab resolve, já que não há Python local), anexar
  `saida/tendencias.png` e `alertas.json`, capturar terminal e monitor serial, publicar o projeto no
  Wokwi e colar o link. Enquanto isso não acontecer, o `.docx` precisa carregar a ressalva em vez de
  escondê-la: corrigir o gerador para preservar os blockquotes `[PENDENTE]`.

### 2. `mqtt.Client(client_id=...)` quebra com paho-mqtt 2.x — [IMPORTANTE] (novo)
- **Onde:** `analise/analise_preditiva.py:215` contra `relatorio.md:463` (`pip install ... paho-mqtt`)
- **Problema:** desde a versão 2.0 o paho exige `CallbackAPIVersion` como primeiro argumento;
  `mqtt.Client(client_id="analise-preditiva-lab7")` levanta `ValueError: Unsupported callback API
  version` já na construção do cliente. Como o relatório manda instalar `paho-mqtt` sem fixar versão,
  o pip traz a 2.x e a execução aborta na etapa de publicação — depois de gerar gráfico e JSON, o que
  torna a falha fácil de não perceber. Não foi possível confirmar por execução (sem Python nesta
  máquina); é dedução da mudança de API documentada.
- **Correção:** `mqtt.Client(mqtt.CallbackAPIVersion.VERSION1, client_id="analise-preditiva-lab7")`,
  ou fixar `pip install "paho-mqtt<2"` no relatório e no cabeçalho do script.

### 3. Detalhes do script e do relatório que não fecham — [MENOR] (novos)
- `analise_preditiva.py:19` — `import numpy as np` nunca é usado. O relatório (§11) afirma que o
  script "usa pandas, numpy, matplotlib e paho-mqtt": numpy entra só na lista de imports.
- `relatorio.md:263` — "episódio de calor seco entre os dias 41 e 47". Contado a partir de 01/07, o
  episódio do CSV vai do dia 42 ao 48 (11/08 a 17/08). Erro de um dia.
- `relatorio.md:263` — "gerado com semente fixa para ser reproduzível": não há gerador na pasta, só o
  CSV. A afirmação não é verificável; ou se anexa o script gerador, ou se diz apenas que o dataset é
  simulado.
- `relatorio.md:370-372` — "o payload de alerta passa disso [256 bytes]". Um alerta serializado pelo
  script tem cerca de 180 caracteres. `setBufferSize(1024)` continua sendo boa prática, mas a
  justificativa apresentada é falsa.
- `esp32_assinante/sketch.ino:60` — `StaticJsonDocument<512>` está depreciado no ArduinoJson 7, que é
  o que o Wokwi instala com `libraries.txt` sem versão. Compila com aviso; a forma atual é
  `JsonDocument`.

### 4. Pendências da 1ª rodada que seguem abertas — [registro]
- Código completo não chega ao corretor (só recortes no documento) — IMPORTANTE.
- Trecho da `decidir()` citado de forma condensada — MENOR.
- Relatório pedido em PDF, entregue em `.docx` — Parcial.
- Atribuição de MQTT à "semana 6" (`relatorio.md:242`) — MENOR; agora soa pior, já que MQTT é o
  conteúdo da Atividade #2 desta mesma tarefa.
- Sentido de leitura do LDR, polaridade do buzzer e alimentação do LCD seguem sem confirmação por
  execução.

## Riscos de fabricação

**Nenhum resultado fabricado.** A Atividade #2 foi escrita com disciplina: em nenhum ponto o texto
diz quantos alertas foram gerados, qual foi a temperatura média do período ou o que apareceu no
monitor serial do assinante. As afirmações sobre o dataset (1440 leituras, 60 dias, episódio de calor
seco) foram conferidas contra o CSV e batem, com a ressalva do deslocamento de um dia apontada acima.
As lacunas reais estão marcadas como `[PENDENTE]`.

Ressalva idêntica à da 1ª rodada: essa honestidade não sobrevive à geração do `.docx`. Sem os
marcadores, a §7 e a §12 leem-se como validação e publicação realizadas.

## Conclusão

A Atividade #2 fecha o bloqueante principal, e fecha bem: dataset consistente, script coerente com o
que o relatório descreve, assinante batendo pino a pino com o diagrama, bibliotecas cobertas e uma
seção de segurança MQTT acima da média. O que ainda reprova é o mesmo de antes — link do Wokwi,
capturas, gráficos e JSON são entregáveis explícitos, não existem, e o documento entregue não avisa
que não existem. Rodar o script no Colab e anexar as saídas resolve boa parte disso em minutos;
corrigir a chamada do paho antes de rodar evita o erro na etapa de publicação.

Prazo: hoje, 23/08/2026 às 23:59 (UTC-3).
