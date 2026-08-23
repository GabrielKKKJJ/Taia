# Revisão — Tarefa Semana 07 · 7.4 Tarefas (Monitoramento de sinais vitais)

**Veredito:** APROVADO
**Revisado em:** 2026-08-23 12:40 (UTC-3)

## Cobertura do enunciado

| # | O que foi pedido | Situação | Onde está / o que falta |
|---|---|---|---|
| 1 | Projeto de IoT para monitoramento de sinais vitais de pacientes | Atende | `relatorio.md` §1 (premissas do domínio) e §2 (arquitetura em 4 camadas: borda, transporte, nuvem, consumo) |
| 2 | Quais tecnologias você escolheria | Atende | §3.1 sensores (MAX30102, AD8232, MLX90614), §3.2 ESP32, §3.3 BLE + MQTT, §3.4 tópicos e QoS, §3.5 TimescaleDB e filtragem na borda |
| 3 | Quais funcionalidades o sistema teria | Atende | §4, tabela com 8 funcionalidades descritas |
| 4 | "Descreva" — justificar as escolhas | Atende | Cada escolha vem com o porquê: coluna "Por que este" em §3.1, comparação MQTT × HTTP em §3.3, uso de QoS por criticidade em §3.4 |
| 5 | Rubrica — clareza e consistência | Atende | 8 seções encadeadas; a tese ("tratar sinais por criticidade") é levantada em §1 e fechada em §7 |
| 6 | Rubrica — relevância do conteúdo (semana 7: IoT na saúde e tendências emergentes) | Atende (com ressalva) | O eixo "IoT em saúde" do módulo está bem coberto; falta tocar nos demais tópicos da semana — ver problema 1 |
| 7 | Rubrica — evidência de conhecimento (exemplos, referências) | Atende | Hierarquia de tópicos concreta (§3.4), citação da LGPD art. 5º II, 6 referências primárias (§8) |
| 8 | Rubrica — resposta aos colegas | Não aplicável | Critério do fórum 7.2, não desta tarefa |
| 9 | Formato de entrega (`online_text_entry`) | Atende | `Tarefa Semana 07 - IoT.docx` gerado a partir do `relatorio.md`, com a Figura 1 renderizada |

## Problemas encontrados

### 1. Pouca conexão com as tendências emergentes da semana — [MENOR]
- **Onde:** `entrega/relatorio.md` §3 e §4
- **Problema:** o módulo 7 é "Tendências emergentes e direções futuras em IoT" e lista explicitamente 5G, integração de IA/ML com IoT, AIoT e Big Data (`_contexto/materiais/modulo-7-visao-geral.md:13-23`; a leitura obrigatória é justamente o material de AIoT da Bosch). O documento resolve tudo com regras de limiar fixas e não menciona nenhum desses eixos. Não é falha de enunciado — a pergunta foi respondida —, mas é a diferença entre "relevante" e "aprofundado" na rubrica.
- **Correção:** duas ou três frases bastam: detecção de arritmia por modelo ML embarcado na borda (AIoT) como evolução do motor de regras, e 5G/NB-IoT como alternativa ao gateway BLE→Wi-Fi em monitoramento domiciliar.

### 2. "Alerta em até 30 s" aparece sem estar entre os requisitos — [MENOR]
- **Onde:** `entrega/relatorio.md:142`
- **Problema:** o número 30 s surge dentro da tabela de funcionalidades sem ser apresentado como meta de projeto nem justificado. É pequeno, mas é o único número do texto que um leitor poderia ler como medição.
- **Correção:** deixar explícito que é um requisito adotado ("meta de projeto: detectar em até 30 s, via *heartbeat* de 10 s com 3 perdas").

### 3. Verificações que passaram (registro) — [—]
- Não há código nesta entrega — corretamente, o enunciado pede um documento de projeto ("Descreva"), não implementação. Nada a compilar.
- Terminologia coerente com o domínio: QoS 0/1/2, retained, LWT e MQTT estão usados com o significado correto da especificação; MAX30102 e AD8232 existem e são dos fabricantes citados; a citação da LGPD (dado sensível, art. 5º, II) está certa.
- Escopo: §6 ("Limitações assumidas") delimita o que o projeto não é, em vez de inflar entregáveis. Nenhuma seção sobra em relação ao pedido.
- `.docx` gerado e alinhado ao `relatorio.md`; nenhum marcador de pendência pendurado no documento.

## Riscos de fabricação

Nenhum. O documento é de projeto: não há medição, saída de terminal, gráfico ou resultado experimental apresentado como observado. Os únicos números são parâmetros de projeto (QoS por tópico, intervalos, cabeçalho de 2 bytes do MQTT) e propriedades documentadas dos componentes citados.

## Conclusão

Entrega pronta para submeter. Responde às duas perguntas do enunciado — tecnologias e funcionalidades — com justificativa técnica real, e não inventa nenhum resultado. As duas ressalvas são de acabamento e melhoram a nota na rubrica de "relevância do conteúdo": encaixar uma menção a IA/ML na borda e a 5G/NB-IoT, e explicitar que os 30 s são meta de projeto.

Prazo: hoje, 23/08/2026 às 23:59 (UTC-3) — ainda não venceu.
