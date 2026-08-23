/*
 * Hello World - ESP32 no Wokwi
 * Internet das Coisas (CSIO-353) - Semana 6
 *
 * O "hello world" de um sistema embarcado nao e imprimir texto: e provar que o
 * codigo roda no microcontrolador e que ele consegue agir sobre o mundo. Por
 * isso este exemplo faz as duas coisas ao mesmo tempo - escreve na serial e
 * pisca um LED fisico.
 */

// GPIO onde o LED esta ligado. No Wokwi o pino aparece escrito na placa.
const int PINO_LED = 2;

// Intervalo do pisca, em milissegundos.
const unsigned long INTERVALO = 1000;

// Guarda o instante da ultima troca de estado. Usar millis() em vez de delay()
// deixa o laco livre para fazer outras coisas - e o padrao que qualquer projeto
// IoT real acaba precisando, porque delay() congela o processador inteiro.
unsigned long ultimaTroca = 0;
bool ligado = false;
unsigned long contador = 0;

void setup() {
  // 115200 e a velocidade padrao do ESP32. O Monitor Serial do Wokwi precisa
  // estar na mesma taxa, senao aparecem apenas caracteres invalidos.
  Serial.begin(115200);

  pinMode(PINO_LED, OUTPUT);
  digitalWrite(PINO_LED, LOW);

  Serial.println();
  Serial.println("=====================================");
  Serial.println("  Hello, World! - ESP32 no Wokwi");
  Serial.println("=====================================");
  Serial.print("Chip: ");
  Serial.println(ESP.getChipModel());
  Serial.print("Frequencia da CPU: ");
  Serial.print(ESP.getCpuFreqMHz());
  Serial.println(" MHz");
  Serial.print("Memoria livre: ");
  Serial.print(ESP.getFreeHeap());
  Serial.println(" bytes");
  Serial.println("-------------------------------------");
}

void loop() {
  unsigned long agora = millis();

  if (agora - ultimaTroca >= INTERVALO) {
    ultimaTroca = agora;
    ligado = !ligado;
    digitalWrite(PINO_LED, ligado ? HIGH : LOW);

    contador++;
    Serial.print("[");
    Serial.print(agora / 1000);
    Serial.print("s] ciclo ");
    Serial.print(contador);
    Serial.print(" | LED ");
    Serial.println(ligado ? "ACESO" : "APAGADO");
  }

  // O laco continua livre: aqui entrariam leitura de sensor, envio MQTT, etc.
}
