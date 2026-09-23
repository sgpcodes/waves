"""Integrações com as APIs públicas usadas pela Dashboard.

- IBGE: catálogo de municípios por UF (nome + código).
- Open-Meteo Geocoding: nome da cidade + UF -> latitude/longitude.
- Open-Meteo Forecast: clima atual + previsão de 15 dias, normalizado no
  formato que o frontend consome (ver `normalizar_clima`).

Nenhuma delas precisa de chave.
"""
import unicodedata
from datetime import date

import requests

TIMEOUT = 10
TIMEOUT_IBGE = 25  # a API do IBGE às vezes demora bem mais que as outras

IBGE_MUNICIPIOS_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados/{uf}/municipios'
GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'
FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

UFS = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

# Nome por extenso — o geocoding devolve o estado em `admin1` assim, não a
# sigla. Usado pra desempatar cidades com o mesmo nome em estados
# diferentes (ex.: "Bom Jesus" existe em pelo menos 4 estados).
NOME_POR_UF = {
    'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas', 'BA': 'Bahia', 'CE': 'Ceará',
    'DF': 'Distrito Federal', 'ES': 'Espírito Santo', 'GO': 'Goiás', 'MA': 'Maranhão',
    'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul', 'MG': 'Minas Gerais', 'PA': 'Pará',
    'PB': 'Paraíba', 'PR': 'Paraná', 'PE': 'Pernambuco', 'PI': 'Piauí', 'RJ': 'Rio de Janeiro',
    'RN': 'Rio Grande do Norte', 'RS': 'Rio Grande do Sul', 'RO': 'Rondônia', 'RR': 'Roraima',
    'SC': 'Santa Catarina', 'SP': 'São Paulo', 'SE': 'Sergipe', 'TO': 'Tocantins',
}

# WMO Weather Codes que a Open-Meteo devolve -> texto em português.
DESCRICAO_POR_CODIGO = {
    0: 'Céu limpo',
    1: 'Predominantemente limpo',
    2: 'Parcialmente nublado',
    3: 'Nublado',
    45: 'Neblina',
    48: 'Neblina com geada',
    51: 'Garoa fraca',
    53: 'Garoa moderada',
    55: 'Garoa forte',
    61: 'Chuva fraca',
    63: 'Chuva moderada',
    65: 'Chuva forte',
    71: 'Neve fraca',
    73: 'Neve moderada',
    75: 'Neve forte',
    80: 'Pancadas de chuva fracas',
    81: 'Pancadas de chuva moderadas',
    82: 'Pancadas de chuva fortes',
    95: 'Tempestade',
    96: 'Tempestade com granizo',
    99: 'Tempestade forte com granizo',
}

CODIGOS_CHUVA = {51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86}
CODIGOS_TEMPESTADE = {95, 96, 99}
CODIGOS_NUBLADO = {3, 45, 48}

PONTOS_CARDEAIS = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO']
DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']  # date.weekday(): 0 = segunda


def normalizar_texto(texto):
    sem_acento = unicodedata.normalize('NFD', texto or '')
    return ''.join(c for c in sem_acento if unicodedata.category(c) != 'Mn').lower()


def descricao_tempo(codigo):
    return DESCRICAO_POR_CODIGO.get(codigo, 'Condição indisponível')


def condicao_por_codigo(codigo):
    """Reduz o WMO code às condições que têm ícone próprio no front
    (assets/clima/*.png). Tempestade reaproveita o ícone de chuva lá."""
    if codigo is None:
        return 'sol'
    if codigo in CODIGOS_TEMPESTADE:
        return 'tempestade'
    if codigo in CODIGOS_CHUVA:
        return 'chuva'
    if codigo in CODIGOS_NUBLADO:
        return 'nublado'
    if codigo == 2:
        return 'parcialmente-nublado'
    return 'sol'  # 0 (céu limpo), 1 (predominantemente limpo)


def direcao_texto(graus):
    if graus is None:
        return '—'
    return PONTOS_CARDEAIS[round(graus / 45) % 8]


def intensidade_vento(kmh):
    if kmh is None:
        return '—'
    if kmh < 20:
        return 'Fraco'
    if kmh < 40:
        return 'Moderado'
    return 'Forte'


def buscar_municipios_ibge(uf):
    resposta = requests.get(IBGE_MUNICIPIOS_URL.format(uf=uf), timeout=TIMEOUT_IBGE)
    resposta.raise_for_status()
    return [{'codigo': str(item['id']), 'nome': item['nome']} for item in resposta.json()]


def geocodificar_cidade(cidade, uf):
    """Devolve (latitude, longitude) da cidade brasileira, ou None se o
    geocoding não achar nada. Prioriza o resultado do estado certo."""
    parametros = {'name': cidade, 'count': 10, 'language': 'pt', 'countryCode': 'BR'}
    resposta = requests.get(GEOCODING_URL, params=parametros, timeout=TIMEOUT)
    resposta.raise_for_status()
    resultados = resposta.json().get('results') or []
    if not resultados:
        return None

    nome_estado = normalizar_texto(NOME_POR_UF.get(uf, ''))
    escolhido = next(
        (item for item in resultados if normalizar_texto(item.get('admin1')) == nome_estado),
        resultados[0],
    )
    return escolhido['latitude'], escolhido['longitude']


def _item(lista, indice):
    if lista is None or indice >= len(lista):
        return None
    return lista[indice]


def normalizar_clima(dados):
    """Converte a resposta crua do Open-Meteo no contrato do frontend."""
    atual = dados.get('current') or {}
    diaria = dados.get('daily') or {}
    horaria = dados.get('hourly') or {}

    # Posição de "hoje" em `daily.time`, comparando com `current.time` (os
    # dois no fuso America/Sao_Paulo). Com past_days isso não é 0.
    hoje_iso = (atual.get('time') or '')[:10]
    datas = diaria.get('time') or []
    indice_hoje = next((i for i, d in enumerate(datas) if d >= hoje_iso), 0)

    previsao_diaria = []
    for i in range(indice_hoje, len(datas)):
        data_iso = datas[i]
        codigo = _item(diaria.get('weather_code'), i)
        vento_max = _item(diaria.get('wind_speed_10m_max'), i)
        previsao_diaria.append({
            'data': data_iso,
            'diaSemana': DIAS_SEMANA[date.fromisoformat(data_iso).weekday()],
            'tempMax': _item(diaria.get('temperature_2m_max'), i),
            'tempMin': _item(diaria.get('temperature_2m_min'), i),
            'chuvaProbabilidade': _item(diaria.get('precipitation_probability_max'), i),
            'weatherCode': codigo,
            'condicao': condicao_por_codigo(codigo),
            'condicaoTexto': descricao_tempo(codigo),
            'ventoVelocidade': vento_max,
            'ventoDirecaoTexto': direcao_texto(_item(diaria.get('wind_direction_10m_dominant'), i)),
            'ventoIntensidade': intensidade_vento(vento_max),
        })

    # Hora a hora (passado + futuro) — alimenta o painel manhã/tarde/noite
    # que abre ao clicar num dia.
    previsao_horaria = []
    for i, data_hora in enumerate(horaria.get('time') or []):
        codigo = _item(horaria.get('weather_code'), i)
        previsao_horaria.append({
            'dataHora': data_hora,
            'data': data_hora[:10],
            'temperatura': _item(horaria.get('temperature_2m'), i),
            'chuvaProbabilidade': _item(horaria.get('precipitation_probability'), i),
            'condicao': condicao_por_codigo(codigo),
        })

    visibilidade = atual.get('visibility')

    return {
        'atualizadoEm': atual.get('time'),
        'temperatura': atual.get('temperature_2m'),
        'pontoDeOrvalho': atual.get('dew_point_2m'),
        'indiceUV': atual.get('uv_index'),
        'precipitacao': atual.get('precipitation'),
        'visibilidadeKm': round(visibilidade / 1000, 1) if visibilidade is not None else None,
        'condicao': condicao_por_codigo(atual.get('weather_code')),
        'condicaoTexto': descricao_tempo(atual.get('weather_code')),
        'nascerSol': _item(diaria.get('sunrise'), indice_hoje),
        'porSol': _item(diaria.get('sunset'), indice_hoje),
        'previsaoDiaria': previsao_diaria,
        'previsaoHoraria': previsao_horaria,
    }


def buscar_clima(latitude, longitude):
    parametros = {
        'latitude': latitude,
        'longitude': longitude,
        'current': ','.join([
            'temperature_2m',
            'precipitation',
            'weather_code',
            'dew_point_2m',
            'uv_index',
            'visibility',
        ]),
        'hourly': ','.join([
            'temperature_2m',
            'precipitation_probability',
            'weather_code',
        ]),
        'daily': ','.join([
            'sunrise',
            'sunset',
            'precipitation_probability_max',
            'weather_code',
            'temperature_2m_max',
            'temperature_2m_min',
            'wind_speed_10m_max',
            'wind_direction_10m_dominant',
        ]),
        # 15 dias de previsão — o teto da Open-Meteo é 16.
        'forecast_days': 15,
        'timezone': 'America/Sao_Paulo',
    }
    resposta = requests.get(FORECAST_URL, params=parametros, timeout=TIMEOUT)
    resposta.raise_for_status()
    return normalizar_clima(resposta.json())
