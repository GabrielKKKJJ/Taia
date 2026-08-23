# 6.2 Fórum — IoT (Semana 6)

> Formato de entrega: `discussion_topic`. Cole o texto direto no fórum do Canvas.
> São duas partes: o **post inicial** e a **resposta a um colega**.

---

## PARTE 1 — Post inicial

### Discussão 1 — Wokwi ou Tinkercad, sem hardware disponível

Eu escolheria o **Wokwi**, mas a escolha depende do que se pretende fazer, e as duas
plataformas resolvem problemas diferentes.

O **Tinkercad Circuits** é da Autodesk e foi pensado para ensino de eletrônica básica.
A montagem é feita arrastando componentes numa protoboard visual, e ele mostra bem coisas
que o Wokwi esconde, como o caminho físico dos fios e a leitura de um multímetro simulado.
A limitação é o alcance: trabalha essencialmente com Arduino Uno e componentes simples, e
não tem conectividade de rede. Para IoT, isso é um teto baixo — dá para simular o sensor,
mas não o "Internet" da Internet das Coisas.

O **Wokwi** foi feito com foco em microcontroladores modernos. Ele suporta ESP32, que é o
que interessa aqui, e junto com isso vem Wi-Fi simulado, o que permite chegar até uma
publicação MQTT real sem placa nenhuma. Ele também aceita as bibliotecas do ecossistema
Arduino, então o mesmo código roda depois no hardware físico sem reescrita. Um detalhe que
achei prático é que o circuito é descrito num arquivo `diagram.json`, com uma entrada por
componente e uma por fio — dá para versionar o circuito no Git junto com o firmware e
compartilhar o projeto inteiro por um link.

Resumindo o critério: se o objetivo é entender corrente, tensão e ligação física, o
Tinkercad é mais didático. Se o objetivo é desenvolver firmware de IoT com conectividade, o
Wokwi é a ferramenta certa.

Vale registrar o que nenhum dos dois faz: simulador reproduz **lógica**, não **física**. Mau
contato, ruído elétrico, queda de tensão em fio longo e alcance real de antena não aparecem
na simulação, e são justamente as falhas mais comuns na bancada.

### Discussão 2 — Plataformas profissionais além de TagoIO e Blynk

Pesquisando o que se usa em produção, encontrei quatro que operam numa escala diferente das
plataformas voltadas a protótipo:

**AWS IoT Core.** Serviço gerenciado da Amazon que aguenta milhões de dispositivos
conectados. O diferencial é o *Device Shadow*: uma cópia do estado do dispositivo que fica
na nuvem, permitindo que a aplicação leia e escreva o estado desejado mesmo com o
dispositivo offline. Quando ele reconecta, sincroniza. Isso resolve um problema real de
campo, que é o dispositivo com conectividade intermitente.

**Azure IoT Hub.** Equivalente da Microsoft, com forte integração ao restante do Azure e um
recurso chamado *IoT Edge*, que empurra processamento para o gateway local — útil quando não
faz sentido mandar tudo para a nuvem.

**ThingsBoard.** É open source, o que muda a conta: pode ser hospedado na própria
infraestrutura, sem custo por dispositivo e sem depender de um fornecedor. Traz painéis
configuráveis, regras e suporte a MQTT, CoAP e HTTP. É a opção que aparece quando há
exigência de manter o dado dentro de casa.

**Losant e Particle** completam a lista com um posicionamento intermediário — mais prontas
que o ThingsBoard, mais robustas que Blynk ou TagoIO, voltadas a empresas que querem sair do
protótipo sem montar uma equipe de infraestrutura.

A diferença central em relação ao TagoIO e ao Blynk não é a quantidade de recursos, e sim
**o que acontece quando o número de dispositivos cresce**: gerenciamento de identidade por
dispositivo, provisionamento em lote, atualização de firmware remota e revogação de
credencial. São coisas que ninguém precisa com dez sensores e que se tornam obrigatórias com
dez mil.

---

## PARTE 2 — Resposta a um colega

> Escolha um colega e adapte. As instruções pedem 2 ou 3 frases, com um detalhe adicional
> e uma pergunta de volta.

**Modelo A — se o colega defendeu o Tinkercad:**

Concordo que o Tinkercad é mais intuitivo para quem está começando, principalmente porque a
montagem visual na protoboard deixa o circuito muito mais palpável do que a lista de
conexões do Wokwi. Só acrescentaria que essa vantagem some quando o projeto precisa de
conectividade: sem suporte a ESP32 e Wi-Fi, não dá para simular a parte de rede, que é
metade de um projeto de IoT. Você chegou a testar algum projeto com comunicação no
Tinkercad, ou usou outra ferramenta para essa parte?

**Modelo B — se o colega falou de TagoIO ou Blynk:**

Boa comparação, e concordo que para protótipo o TagoIO resolve muito rápido justamente por
já entregar painel pronto. O que me chamou atenção pesquisando as plataformas profissionais
foi a diferença no gerenciamento de dispositivos — coisas como provisionamento em lote e
atualização remota de firmware, que só viram problema quando a frota cresce. Na sua
pesquisa, você viu alguma plataforma que faça essa ponte bem, servindo tanto para protótipo
quanto para produção?
