/*
 * Prototipo de automacao contextual de cidade inteligente
 * Internet das Coisas (CSIO-353) - Laboratorio B.7
 * Plataforma: Wokwi | Microcontrolador: ESP32
 *
 * Entradas : LDR (luminosidade), DHT22 (temperatura e umidade), HC-SR04 (distancia)
 * Saidas   : LED azul (ventilacao), LED verde (pedestres), LED vermelho + buzzer (alerta),
 *            LCD 16x2 via I2C
 *
 * Organizacao: cada bloco do fluxo entradas -> processamento -> saidas tem sua propria
 * funcao. O loop() apenas orquestra, o que mantem a logica de decisao isolada e testavel.
 */

#include <DHT.h>
#include <LiquidCrystal_I2C.h>

// ---------------------------------------------------------------- pinos
const int PINO_LDR      = 34;  // ADC1 - somente entrada, correto para leitura analogica
const int PINO_DHT      = 15;
const int PINO_TRIG     = 5;
const int PINO_ECHO     = 18;
const int PINO_LED_AZUL = 2;
const int PINO_LED_VERD = 4;
const int PINO_LED_VERM = 19;
const int PINO_BUZZER   = 13;  // 21 e 22 ficam livres para o I2C do LCD

// ---------------------------------------------------------------- limiares
// Centralizados aqui de proposito: calibrar o sistema nao deve exigir cacar
// numeros soltos no meio da logica.
const int   LIMIAR_LUZ_BAIXA   = 300;   // leitura do ADC (0-4095)
const float LIMIAR_TEMP_ALTA   = 30.0;  // graus Celsius
const float LIMIAR_TEMP_CRITICA= 35.0;
const float LIMIAR_UMID_BAIXA  = 40.0;  // porcentagem
const float LIMIAR_DIST_PERIGO = 30.0;  // centimetros

const unsigned long INTERVALO_LEITURA = 2000;  // DHT22 nao aceita menos que 2 s

DHT dht(PINO_DHT, DHT22);
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Estado consolidado de um ciclo. Agrupar num struct evita passar seis
// parametros soltos entre as funcoes.
struct Leitura {
  int   luz;
  float temperatura;
  float umidade;
  float distancia;
  bool  valida;
};

struct Acoes {
  bool ventilacao;   // LED azul
  bool pedestres;    // LED verde
  bool alerta;       // LED vermelho + buzzer
  const char* estado;
};

unsigned long ultimaLeitura = 0;

// ---------------------------------------------------------------- entradas

/* Dispara o pulso do HC-SR04 e converte o tempo de eco em centimetros.
 * O som percorre ida e volta, por isso a divisao por 2. O fator 0.0343 e a
 * velocidade do som em cm/us. */
float lerDistancia() {
  digitalWrite(PINO_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PINO_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PINO_TRIG, LOW);

  // Timeout de 30 ms: sem ele, um eco que nunca volta travaria o loop.
  long duracao = pulseIn(PINO_ECHO, HIGH, 30000);
  if (duracao == 0) return 999.0;  // nada detectado no alcance

  return (duracao * 0.0343) / 2.0;
}

Leitura lerSensores() {
  Leitura l;
  l.luz         = analogRead(PINO_LDR);
  l.temperatura = dht.readTemperature();
  l.umidade     = dht.readHumidity();
  l.distancia   = lerDistancia();

  // O DHT22 devolve NaN quando a leitura falha. Propagar NaN para a logica de
  // decisao faria toda comparacao virar falsa silenciosamente - melhor marcar.
  l.valida = !isnan(l.temperatura) && !isnan(l.umidade);
  return l;
}

// ---------------------------------------------------------------- processamento

/* Regras de negocio da cidade inteligente.
 * Isolada de proposito: nao le sensor nem aciona pino, so decide. */
Acoes decidir(const Leitura& l) {
  Acoes a = { false, false, false, "NORMAL" };

  if (!l.valida) {
    a.estado = "ERRO SENSOR";
    return a;
  }

  // Regra 1 - anoitecer com calor: liga ventilacao e libera pedestres.
  if (l.luz < LIMIAR_LUZ_BAIXA && l.temperatura > LIMIAR_TEMP_ALTA) {
    a.ventilacao = true;
    a.pedestres  = true;
    a.estado     = "NOITE QUENTE";
  }

  // Regra 2 - obstaculo proximo: alerta de proximidade.
  if (l.distancia < LIMIAR_DIST_PERIGO) {
    a.alerta = true;
    a.estado = "OBSTACULO";
  }

  // Regra 3 - calor seco: risco de incendio, tem precedencia sobre as demais.
  if (l.temperatura > LIMIAR_TEMP_CRITICA && l.umidade < LIMIAR_UMID_BAIXA) {
    a.alerta     = true;
    a.ventilacao = true;
    a.estado     = "ALERTA SECA";
  }

  return a;
}

// ---------------------------------------------------------------- saidas

void aplicar(const Acoes& a) {
  digitalWrite(PINO_LED_AZUL, a.ventilacao ? HIGH : LOW);
  digitalWrite(PINO_LED_VERD, a.pedestres  ? HIGH : LOW);
  digitalWrite(PINO_LED_VERM, a.alerta     ? HIGH : LOW);

  // tone() nao bloqueia: o buzzer soa enquanto o resto do ciclo continua.
  if (a.alerta) tone(PINO_BUZZER, 1000);
  else          noTone(PINO_BUZZER);
}

void mostrarLcd(const Leitura& l, const Acoes& a) {
  lcd.clear();
  lcd.setCursor(0, 0);
  if (l.valida) {
    lcd.print(l.temperatura, 1);
    lcd.print("C ");
    lcd.print(l.umidade, 0);
    lcd.print("% ");
    lcd.print((int)l.distancia);
    lcd.print("cm");
  } else {
    lcd.print("Falha no DHT22");
  }
  lcd.setCursor(0, 1);
  lcd.print(a.estado);
}

void mostrarSerial(const Leitura& l, const Acoes& a) {
  Serial.print("luz=");   Serial.print(l.luz);
  Serial.print(" temp="); Serial.print(l.temperatura, 1);
  Serial.print("C umid=");Serial.print(l.umidade, 0);
  Serial.print("% dist=");Serial.print(l.distancia, 1);
  Serial.print("cm | estado="); Serial.print(a.estado);
  Serial.print(" | azul="); Serial.print(a.ventilacao);
  Serial.print(" verde=");  Serial.print(a.pedestres);
  Serial.print(" verm=");   Serial.println(a.alerta);
}

// ---------------------------------------------------------------- ciclo

void setup() {
  Serial.begin(115200);

  pinMode(PINO_TRIG, OUTPUT);
  pinMode(PINO_ECHO, INPUT);
  pinMode(PINO_LED_AZUL, OUTPUT);
  pinMode(PINO_LED_VERD, OUTPUT);
  pinMode(PINO_LED_VERM, OUTPUT);
  pinMode(PINO_BUZZER,   OUTPUT);

  dht.begin();
  lcd.init();
  lcd.backlight();

  lcd.setCursor(0, 0);
  lcd.print("Cidade Wokwi");
  lcd.setCursor(0, 1);
  lcd.print("Iniciando...");

  Serial.println("Prototipo de cidade inteligente - ESP32");
  delay(1500);
}

void loop() {
  unsigned long agora = millis();
  if (agora - ultimaLeitura < INTERVALO_LEITURA) return;
  ultimaLeitura = agora;

  Leitura leitura = lerSensores();
  Acoes   acoes   = decidir(leitura);

  aplicar(acoes);
  mostrarLcd(leitura, acoes);
  mostrarSerial(leitura, acoes);
}
