# 6.2 Fórum — Programação 6 (Semana 6)

> Formato de entrega: `discussion_topic`. Cole o texto direto no fórum do Canvas.
> As respostas abaixo se apoiam no capstone Battle Tanks. Onde descrevem o que já está
> implementado, dizem isso; onde descrevem o que ainda é proposta, também.

---

## PARTE 1 — Post inicial

### Discussão 1 — Escalabilidade de SignalR vs MQTT em jogos multijogador

**Que vantagens o MQTT oferece em alta concorrência.**
A principal é o *fan-out*. Com SignalR, transmitir para N jogadores custa N envios ao
processo do servidor, e escalar horizontalmente exige um backplane — normalmente Redis —
para sincronizar as instâncias. Com MQTT, o broker já é esse ponto central projetado para
distribuir: o publicador emite uma vez só, e o custo do servidor de jogo não cresce com o
número de espectadores daquele evento.

A segunda vantagem é o *overhead por mensagem*. O cabeçalho fixo do MQTT ocupa 2 bytes,
contra o envelope de invocação de método do SignalR. Numa partida que emite dezenas de
eventos por segundo por sala, isso muda o consumo de banda de forma perceptível,
especialmente em rede móvel.

A terceira é o **desacoplamento**. No SignalR, adicionar um consumidor novo de eventos — um
placar global, um sistema de replay — significa mexer no hub. Com MQTT, o consumidor assina
o tópico e o backend do jogo não muda uma linha.

**Como o QoS afeta a experiência de jogo.**
O QoS deixa escolher a garantia de entrega **mensagem a mensagem**, e é aí que está o
potencial. Sendo honesto sobre o nosso estado atual: **hoje publicamos tudo com QoS 1**, sem
diferenciação — o cliente Angular usa `qos: 1` fixo no `publish`, e o backend publica com
`AtLeastOnce` em todos os tópicos. Funciona, mas desperdiça a principal vantagem do
protocolo.

A diferenciação que faz sentido, e que pretendo propor ao grupo, é: posição de tanque em
QoS 0, porque um pacote perdido é corrigido pelo seguinte dezenas de milissegundos depois e
o jogador não percebe; dano e destruição de cenário em QoS 1, porque perder um deles deixa
clientes com visões diferentes do mundo.

QoS 2 não se justifica em nenhum dos casos: o handshake de quatro vias custa latência, e a
garantia extra não compra nada quando o consumidor é idempotente — aplicar duas vezes "vida
do jogador X é 40" dá o mesmo resultado.

**Trade-offs.**

| | SignalR | MQTT |
|---|---|---|
| Latência | menor no caminho direto | soma o salto pelo broker |
| Confiabilidade | garantia uniforme | escolhível por mensagem |
| Overhead | envelope de RPC | 2 bytes de cabeçalho |
| Operação | nada extra a manter | um broker a mais no ar |
| Tipagem | forte, erro vira erro de compilação | payload livre, contrato por convenção |

O custo do MQTT que menos se menciona é operacional: é mais uma peça para monitorar, e o
broker vira ponto único de falha se não for replicado.

**Casos no capstone.**
Na nossa implementação, chat, entrar e sair de sala e o cronômetro ficaram no SignalR,
porque só fazem sentido dentro da sessão e o RPC tipado do hub evita serializar e rotear na
mão. Dano e destruição de parede foram para o MQTT, combinados com Redis, porque precisam
sobreviver à sessão: um jogador que cai e volta reconstrói o cenário como ele está.

Um ponto ainda em aberto: power-up hoje é resolvido localmente no cliente, sem passar nem
pelo hub nem pelo broker. Pelo critério abaixo ele deveria ir para o MQTT, e é uma das
coisas que pretendo levantar com o grupo.

A régua que adotamos: **se o evento só vale dentro da sessão, é SignalR; se vale depois, ou
para alguém de fora, é MQTT.**

### Discussão 2 — Priorização de eventos em sistemas em tempo real

**Como priorizar.** O critério que usamos é a consequência de perder o evento, não a
frequência dele. Colisão e disparo mudam o estado do jogo; chat, não. Isso deveria se
traduzir em QoS diferenciado — o que ainda não fazemos — e já se traduz na hierarquia de
tópicos, que permite ao cliente assinar só o que lhe interessa.

**Estratégias para garantir entrega do que é crítico.** QoS 1 com consumidor idempotente é
a base. Junto com isso, identificador por evento para descartar duplicata, e reconstrução de
estado ao entrar na sala — no nosso caso, o `ReceiveRoomState` devolve a semente do mapa e a
lista de paredes destruídas, de modo que mesmo tendo perdido eventos o cliente chega ao
estado correto. Essa última parte é o que realmente salva: em vez de tentar garantir que
nenhuma mensagem se perca, garantimos que o estado possa ser reconstruído.

**Reduzir congestão.** Três técnicas práticas: agrupar posições em lote em vez de enviar
cada quadro; reduzir a frequência de envio conforme a distância — quem está longe não precisa
de atualização a 60 Hz; e enviar apenas o que mudou, em vez do estado completo. Chat e
eventos não críticos podem ser bufferizados por alguns milissegundos sem prejuízo perceptível.

**Impacto na UI.** Aqui vale separar o que é visual do que é estado. Uma explosão pode ser
disparada localmente por predição, antes da confirmação do servidor, porque errar custa um
efeito visual a mais. Já a pontuação nunca deve ser prevista: se o cliente antecipar e o
servidor discordar, o número pula na tela, e o jogador percebe. A regra que seguimos é
**prever o que é cosmético, esperar confirmação para o que é estado**.

---

## PARTE 2 — Resposta a um colega

> O enunciado pede resposta a **um** colega, em 2 ou 3 frases, pedindo mais detalhes sobre
> a pesquisa dele. Escolha o modelo conforme a discussão que o colega respondeu.

**Modelo A — se o colega defendeu usar só SignalR:**

Faz sentido, e concordo que para o escopo de uma partida o SignalR resolve com muito menos
peça para manter no ar. O que nos levou a somar o MQTT foi um caso específico: eventos que
precisam sobreviver à sessão, como parede destruída, para que um jogador que reconecta veja o
cenário como ele está e não como começou. Vocês trataram reconexão de alguma forma, ou o
jogador que cai perde o estado da partida?

**Modelo B — se o colega falou de QoS (Discussão 1):**

Boa explicação sobre os níveis. Só acrescentaria um ponto: o QoS 2 raramente compensa em
jogo, porque o handshake de quatro vias custa latência e a duplicação que o QoS 1 permite é
inofensiva quando o consumidor é idempotente. Vocês chegaram a medir a diferença de latência
entre os níveis, ou escolheram pelo critério teórico?

**Modelo C — se o colega respondeu a Discussão 2 (priorização de eventos):**

Concordo com o critério de priorizar pela consequência de perder o evento, e não pela
frequência. O que me ajudou a fechar essa ideia foi perceber que garantir entrega é menos
importante do que garantir que o estado possa ser reconstruído — no nosso caso o cliente
recebe a semente do mapa e as paredes destruídas ao entrar, então mesmo perdendo eventos ele
chega ao estado certo. Como vocês trataram o cliente que reconecta no meio da partida?
