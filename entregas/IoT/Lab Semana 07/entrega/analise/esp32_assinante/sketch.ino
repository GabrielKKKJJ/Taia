/*
 * ESP32 assinante de alertas - Laboratorio B.7, Atividade #2
 *
 * Assina /iot/alertas e reage ao tipo de alerta recebido:
 *   seca             -> LED vermelho aceso + buzzer
 *   superaquecimento -> LED amarelo piscando
 *   qualquer outro   -> LED verde (sistema vivo, sem alerta)
 *
 * Wokwi: usar a rede simulada "Wokwi-GUEST", que nao exige senha.
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* SSID     = "Wokwi-GUEST";
const char* SENHA    = "";
const char* BROKER   = "test.mosquitto.org";
const int   PORTA    = 1883;
const char* TOPICO   = "/iot/alertas";

const int PINO_VERDE    = 2;
const int PINO_AMARELO  = 4;
const int PINO_VERMELHO = 19;
const int PINO_BUZZER   = 13;

WiFiClient wifi;
PubSubClient mqtt(wifi);

// Estado do alerta atual. O piscar do amarelo acontece no loop, sem delay(),
// para nao bloquear o cliente MQTT - se o loop travar, a conexao cai.
bool alertaSeca = false;
bool alertaSuperaquecimento = false;
unsigned long ultimoPisca = 0;
bool amareloAceso = false;

void conectarWifi() {
  Serial.print("Conectando ao Wi-Fi");
  WiFi.begin(SSID, SENHA);
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.print(" ok, IP ");
  Serial.println(WiFi.localIP());
}

/* Chamado a cada mensagem recebida no topico assinado. */
void aoReceber(char* topico, byte* payload, unsigned int tamanho) {
  // O payload nao vem terminado em nulo: copiar para uma String e o caminho seguro.
  String texto;
  texto.reserve(tamanho);
  for (unsigned int i = 0; i < tamanho; i++) texto += (char)payload[i];

  Serial.print("[");
  Serial.print(topico);
  Serial.print("] ");
  Serial.println(texto);

  StaticJsonDocument<512> doc;
  DeserializationError erro = deserializeJson(doc, texto);
  if (erro) {
    Serial.print("JSON invalido: ");
    Serial.println(erro.c_str());
    return;
  }

  const char* tipo = doc["tipo"] | "";
  const char* data = doc["data"] | "?";

  alertaSeca = (strcmp(tipo, "seca") == 0);
  alertaSuperaquecimento = (strcmp(tipo, "superaquecimento") == 0);

  Serial.print(">> alerta de ");
  Serial.print(tipo);
  Serial.print(" referente a ");
  Serial.println(data);
}

void reconectar() {
  while (!mqtt.connected()) {
    // ClientId unico: brokers publicos derrubam a conexao anterior quando dois
    // clientes se apresentam com o mesmo id.
    String id = "esp32-assinante-" + String(random(0xffff), HEX);
    Serial.print("Conectando ao broker...");
    if (mqtt.connect(id.c_str())) {
      Serial.println(" ok");
      mqtt.subscribe(TOPICO, 1);   // QoS 1: alerta perdido nao serve para nada
      Serial.print("Assinado em ");
      Serial.println(TOPICO);
    } else {
      Serial.print(" falhou, rc=");
      Serial.print(mqtt.state());
      Serial.println(" - nova tentativa em 3 s");
      delay(3000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PINO_VERDE, OUTPUT);
  pinMode(PINO_AMARELO, OUTPUT);
  pinMode(PINO_VERMELHO, OUTPUT);
  pinMode(PINO_BUZZER, OUTPUT);

  conectarWifi();
  mqtt.setServer(BROKER, PORTA);
  mqtt.setCallback(aoReceber);
  mqtt.setBufferSize(1024);   // o payload de alerta passa dos 256 bytes padrao
}

void loop() {
  if (!mqtt.connected()) reconectar();
  mqtt.loop();                // obrigatorio: processa a fila de entrada

  digitalWrite(PINO_VERMELHO, alertaSeca ? HIGH : LOW);
  if (alertaSeca) tone(PINO_BUZZER, 1200);
  else            noTone(PINO_BUZZER);

  if (alertaSuperaquecimento) {
    if (millis() - ultimoPisca >= 500) {
      ultimoPisca = millis();
      amareloAceso = !amareloAceso;
      digitalWrite(PINO_AMARELO, amareloAceso ? HIGH : LOW);
    }
  } else {
    digitalWrite(PINO_AMARELO, LOW);
  }

  digitalWrite(PINO_VERDE, (!alertaSeca && !alertaSuperaquecimento) ? HIGH : LOW);
}
