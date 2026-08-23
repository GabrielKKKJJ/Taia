"""
Analise preditiva de dados ambientais e publicacao de alertas via MQTT.
Internet das Coisas (CSIO-353) - Laboratorio B.7, Atividade #2

Fluxo: le o CSV historico -> agrega por dia -> calcula medias moveis ->
aplica regras de inferencia -> gera graficos -> exporta JSON -> publica no broker.

Execucao:
    pip install pandas numpy matplotlib paho-mqtt
    python analise_preditiva.py

No Google Colab, instale com:
    !pip install paho-mqtt
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")          # backend sem janela: necessario em Colab e em CI
import matplotlib.pyplot as plt
import paho.mqtt.client as mqtt

# ----------------------------------------------------------------- parametros
ARQUIVO_CSV = Path(__file__).parent / "dados" / "leituras.csv"
PASTA_SAIDA = Path(__file__).parent / "saida"

JANELA_MEDIA_MOVEL = 3        # dias
DIAS_SUBIDA_ALERTA = 3        # dias consecutivos de alta -> superaquecimento
LIMIAR_TEMP_SECA = 35.0       # graus Celsius
LIMIAR_UMID_SECA = 40.0       # porcentagem

BROKER = "test.mosquitto.org"
PORTA = 1883
TOPICO_ALERTAS = "/iot/alertas"


# ----------------------------------------------------------------- 1. carga
def carregar(caminho: Path) -> pd.DataFrame:
    """Le o CSV e devolve um DataFrame indexado por timestamp."""
    df = pd.read_csv(caminho)
    df["timestamp"] = pd.to_datetime(df["data"] + " " + df["hora"])
    return df.set_index("timestamp").sort_index()


# ------------------------------------------------------- 2. agregacao diaria
def agregar_por_dia(df: pd.DataFrame) -> pd.DataFrame:
    """
    Reduz as 24 leituras horarias a uma linha por dia.

    Guardamos media, maxima e minima porque as regras olham coisas diferentes:
    a tendencia usa a media (menos sensivel a um pico isolado), enquanto o
    alerta de seca usa a maxima do dia, que e quando o risco de fato existe.
    """
    diario = df.resample("D").agg(
        temp_media=("temperatura", "mean"),
        temp_max=("temperatura", "max"),
        temp_min=("temperatura", "min"),
        umid_media=("umidade", "mean"),
        umid_min=("umidade", "min"),
    )
    return diario.round(2)


# --------------------------------------------------- 3. medias moveis e tendencia
def calcular_tendencias(diario: pd.DataFrame) -> pd.DataFrame:
    """
    Media movel suaviza a serie e revela a tendencia por tras do ruido diario.

    `subindo` marca o dia em que a media movel superou a do dia anterior;
    `dias_subindo` conta ha quantos dias consecutivos isso vem ocorrendo.
    """
    d = diario.copy()
    d["temp_mm"] = d["temp_media"].rolling(JANELA_MEDIA_MOVEL).mean().round(2)
    d["umid_mm"] = d["umid_media"].rolling(JANELA_MEDIA_MOVEL).mean().round(2)

    d["variacao"] = d["temp_mm"].diff().round(2)
    d["subindo"] = d["variacao"] > 0

    # Conta a sequencia atual de dias em alta. O truque do cumsum agrupa
    # sequencias consecutivas de True e zera a contagem em cada False.
    grupo = (~d["subindo"]).cumsum()
    d["dias_subindo"] = d.groupby(grupo).cumcount().where(d["subindo"], 0)

    return d


# ----------------------------------------------------------- 4. regras de inferencia
def aplicar_regras(d: pd.DataFrame) -> list[dict]:
    """
    Traduz a serie em alertas.

    Regra 1 - temperatura subindo por N dias seguidos -> superaquecimento.
    Regra 2 - temperatura alta com umidade baixa      -> seca.

    Uma vale sobre a *tendencia*, a outra sobre o *estado atual*. Um sistema
    que so olha o valor instantaneo nao antecipa nada; um que so olha
    tendencia ignora a condicao critica de hoje. Por isso as duas convivem.
    """
    alertas = []

    for data, linha in d.iterrows():
        if pd.isna(linha["temp_mm"]):
            continue  # primeiros dias: media movel ainda sem janela completa

        # Dispara apenas no dia em que a sequencia ATINGE o limiar. Sem esta
        # condicao de igualdade, uma alta de 15 dias geraria 13 alertas identicos
        # e o operador aprenderia a ignorar o canal.
        if linha["dias_subindo"] == DIAS_SUBIDA_ALERTA:
            alertas.append({
                "data": data.strftime("%Y-%m-%d"),
                "tipo": "superaquecimento",
                "severidade": "media",
                "motivo": f"media movel em alta ha {int(linha['dias_subindo'])} dias",
                "temp_media": float(linha["temp_media"]),
                "temp_mm": float(linha["temp_mm"]),
            })

        if linha["temp_max"] > LIMIAR_TEMP_SECA and linha["umid_min"] < LIMIAR_UMID_SECA:
            alertas.append({
                "data": data.strftime("%Y-%m-%d"),
                "tipo": "seca",
                "severidade": "alta",
                "motivo": (f"maxima de {linha['temp_max']} C com umidade minima "
                           f"de {linha['umid_min']}%"),
                "temp_max": float(linha["temp_max"]),
                "umid_min": float(linha["umid_min"]),
            })

    return alertas


# ------------------------------------------------------------------ 5. graficos
def gerar_graficos(d: pd.DataFrame, alertas: list[dict], pasta: Path) -> None:
    pasta.mkdir(parents=True, exist_ok=True)

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8), sharex=True)

    ax1.plot(d.index, d["temp_media"], alpha=0.4, label="media diaria")
    ax1.plot(d.index, d["temp_mm"], linewidth=2,
             label=f"media movel ({JANELA_MEDIA_MOVEL}d)")
    ax1.axhline(LIMIAR_TEMP_SECA, linestyle="--", color="red",
                label=f"limiar de seca ({LIMIAR_TEMP_SECA} C)")

    # Marca no grafico os dias em que cada regra disparou.
    for a in alertas:
        cor = "red" if a["tipo"] == "seca" else "orange"
        ax1.axvline(pd.to_datetime(a["data"]), color=cor, alpha=0.25)

    ax1.set_ylabel("Temperatura (C)")
    ax1.set_title("Tendencia de temperatura e alertas disparados")
    ax1.legend()
    ax1.grid(alpha=0.3)

    ax2.plot(d.index, d["umid_media"], alpha=0.4, label="media diaria")
    ax2.plot(d.index, d["umid_mm"], linewidth=2,
             label=f"media movel ({JANELA_MEDIA_MOVEL}d)")
    ax2.axhline(LIMIAR_UMID_SECA, linestyle="--", color="brown",
                label=f"limiar de seca ({LIMIAR_UMID_SECA}%)")
    ax2.set_ylabel("Umidade (%)")
    ax2.set_xlabel("Data")
    ax2.legend()
    ax2.grid(alpha=0.3)

    fig.tight_layout()
    fig.savefig(pasta / "tendencias.png", dpi=140)
    plt.close(fig)


# ------------------------------------------------------------------ 6. exportacao
def exportar_json(d: pd.DataFrame, alertas: list[dict], pasta: Path) -> dict:
    pasta.mkdir(parents=True, exist_ok=True)

    resumo = {
        "periodo": {
            "inicio": d.index.min().strftime("%Y-%m-%d"),
            "fim": d.index.max().strftime("%Y-%m-%d"),
            "dias": int(len(d)),
        },
        "estatisticas": {
            "temp_media_periodo": float(d["temp_media"].mean().round(2)),
            "temp_maxima": float(d["temp_max"].max()),
            "umid_media_periodo": float(d["umid_media"].mean().round(2)),
            "umid_minima": float(d["umid_min"].min()),
        },
        "parametros": {
            "janela_media_movel_dias": JANELA_MEDIA_MOVEL,
            "dias_subida_para_alerta": DIAS_SUBIDA_ALERTA,
            "limiar_temp_seca": LIMIAR_TEMP_SECA,
            "limiar_umid_seca": LIMIAR_UMID_SECA,
        },
        "total_alertas": len(alertas),
        "alertas": alertas,
    }

    (pasta / "alertas.json").write_text(
        json.dumps(resumo, indent=2, ensure_ascii=False), encoding="utf-8")

    d.to_json(pasta / "serie_diaria.json", orient="index",
              date_format="iso", indent=2)

    return resumo


# ------------------------------------------------------------------ 7. MQTT
def publicar_alertas(alertas: list[dict]) -> None:
    """
    Publica cada alerta em /iot/alertas com QoS 1.

    QoS 1 porque alerta perdido nao adianta nada, e o consumidor e idempotente
    (aplicar duas vezes o mesmo alerta de seca do dia X da no mesmo).
    """
    cliente = mqtt.Client(client_id="analise-preditiva-lab7")

    cliente.connect(BROKER, PORTA, keepalive=60)
    cliente.loop_start()

    for a in alertas:
        payload = json.dumps(a, ensure_ascii=False)
        info = cliente.publish(TOPICO_ALERTAS, payload, qos=1)
        info.wait_for_publish()
        print(f"publicado: {a['tipo']} em {a['data']}")

    cliente.loop_stop()
    cliente.disconnect()


# ------------------------------------------------------------------ principal
def main() -> None:
    df = carregar(ARQUIVO_CSV)
    print(f"{len(df)} leituras carregadas de {ARQUIVO_CSV.name}")

    diario = agregar_por_dia(df)
    diario = calcular_tendencias(diario)

    alertas = aplicar_regras(diario)
    print(f"{len(alertas)} alertas gerados")

    gerar_graficos(diario, alertas, PASTA_SAIDA)
    resumo = exportar_json(diario, alertas, PASTA_SAIDA)
    print(json.dumps(resumo["estatisticas"], indent=2, ensure_ascii=False))

    if alertas:
        publicar_alertas(alertas)


if __name__ == "__main__":
    main()
