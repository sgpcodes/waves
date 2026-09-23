"""Previsão marítima — Open-Meteo Marine Weather API (plano gratuito).

Usa tudo que a API oferece de graça e que tem dado na costa do RJ:

- `current`: as 23 variáveis, no modelo padrão (best_match).
- `hourly`: as 23 variáveis em cada modelo com cobertura no RJ (ver MODELOS).
- `daily`: as 11 variáveis diárias, em todos os modelos; o dia usa o
  modelo padrão e completa o que faltar com os outros (ver PRIORIDADE_DIARIA).
- `minutely_15`: nível do mar e correntes a cada 15 min.
- `era5_ocean`: reanálise histórica (últimos 92 dias, o máximo da API).

A Marine API não tem vento — ele vem da Forecast API da Open-Meteo, no
mesmo ponto (usado pela "Visão intermediária": terral/maral, rajadas).

Modelos que existem na API mas NÃO têm dado no RJ (testado): `dwd_ewam`
(só Europa) e `ncep_gfswave016` (só 52.5°N–15°S). Ficam de fora.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import date

import requests

MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine'
FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
TIMEOUT = 20
FUSO = 'America/Sao_Paulo'

VARIAVEIS_HORARIAS = [
    'wave_height', 'wave_direction', 'wave_period', 'wave_peak_period',
    'wind_wave_height', 'wind_wave_direction', 'wind_wave_period', 'wind_wave_peak_period',
    'swell_wave_height', 'swell_wave_direction', 'swell_wave_period', 'swell_wave_peak_period',
    'secondary_swell_wave_height', 'secondary_swell_wave_period', 'secondary_swell_wave_direction',
    'tertiary_swell_wave_height', 'tertiary_swell_wave_period', 'tertiary_swell_wave_direction',
    'sea_level_height_msl', 'sea_surface_temperature',
    'ocean_current_velocity', 'ocean_current_direction', 'invert_barometer_height',
]

VARIAVEIS_DIARIAS = [
    'wave_height_max', 'wave_direction_dominant', 'wave_period_max',
    'wind_wave_height_max', 'wind_wave_direction_dominant', 'wind_wave_period_max', 'wind_wave_peak_period_max',
    'swell_wave_height_max', 'swell_wave_direction_dominant', 'swell_wave_period_max', 'swell_wave_peak_period_max',
]

VARIAVEIS_15_MIN = ['sea_level_height_msl', 'ocean_current_velocity', 'ocean_current_direction']

VARIAVEIS_ERA5 = ['wave_height', 'wave_direction', 'wave_period']

# Ordem = ordem das cores no gráfico de comparação (não reordenar: a cor
# segue o modelo, nunca a posição na lista).
MODELOS = [
    {
        'id': 'meteofrance_wave', 'nome': 'MeteoFrance Wave', 'fornecedor': 'Serviço de meteorologia da França',
        'descricao': 'Calcula as ondas com bastante detalhe — é o que melhor enxerga a costa aqui.',
        'resolucao': '8 km', 'horizonte': '10 dias', 'atualizacao': 'a cada 12 horas',
    },
    {
        'id': 'meteofrance_currents', 'nome': 'MeteoFrance Currents', 'fornecedor': 'Serviço de meteorologia da França',
        'descricao': 'Não calcula ondas: cuida das correntes, da temperatura da água e do nível do mar (maré).',
        'resolucao': '8 km', 'horizonte': '10 dias', 'atualizacao': '1 vez por dia',
    },
    {
        'id': 'ecmwf_wam', 'nome': 'ECMWF WAM', 'fornecedor': 'Centro europeu de previsão do tempo',
        'descricao': 'Um dos modelos mais respeitados do mundo. Aqui dá só o básico da onda, mas prevê até 15 dias.',
        'resolucao': '9 km', 'horizonte': '15 dias', 'atualizacao': 'a cada 6 horas',
    },
    {
        'id': 'ecmwf_wam025', 'nome': 'ECMWF WAM 0,25°', 'fornecedor': 'Centro europeu de previsão do tempo',
        'descricao': 'Versão menos detalhada do anterior. Serve de segunda opinião pra conferir se os dois concordam.',
        'resolucao': '25 km', 'horizonte': '15 dias', 'atualizacao': 'a cada 6 horas',
    },
    {
        'id': 'ncep_gfswave025', 'nome': 'GFS Wave', 'fornecedor': 'Serviço de meteorologia dos EUA',
        'descricao': 'O que prevê mais longe (16 dias) e o que separa mais tipos de onda, incluindo 3 swells diferentes.',
        'resolucao': '25 km', 'horizonte': '16 dias', 'atualizacao': 'a cada 6 horas',
    },
    {
        'id': 'dwd_gwam', 'nome': 'DWD GWAM', 'fornecedor': 'Serviço de meteorologia da Alemanha',
        'descricao': 'Prevê só até 8 dias, mas é mais uma opinião independente pros primeiros dias.',
        'resolucao': '25 km', 'horizonte': '8 dias', 'atualizacao': 'a cada 12 horas',
    },
]

MODELO_ERA5 = {
    'id': 'era5_ocean', 'nome': 'ERA5 Ocean', 'fornecedor': 'Programa europeu Copernicus',
    'descricao': 'Não é previsão: é o registro do que o mar fez no passado. Alimenta o gráfico de Histórico.',
    'resolucao': '50 km', 'horizonte': 'desde 1940', 'atualizacao': '1 vez por dia',
}

MODELO_PADRAO = {
    'id': 'best_match', 'nome': 'Melhor combinação', 'fornecedor': 'Open-Meteo',
    'descricao': 'Não é um modelo à parte: a Open-Meteo escolhe sozinha o melhor dado pra cada informação. '
                 'É o que aparece em "Agora no mar" e nos primeiros dias.',
    'resolucao': '8 km', 'horizonte': '10 dias', 'atualizacao': 'automática',
}

# Ordem de preenchimento do card diário: modelo padrão, depois quem vai
# mais longe (GFS 16 dias, ECMWF 15 dias), depois o resto.
PRIORIDADE_DIARIA = ['best_match', 'ncep_gfswave025', 'ecmwf_wam', 'ecmwf_wam025', 'meteofrance_wave', 'dwd_gwam']

DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']


def _buscar(parametros, url=MARINE_URL):
    resposta = requests.get(url, params={**parametros, 'timezone': FUSO}, timeout=TIMEOUT)
    resposta.raise_for_status()
    return resposta.json()


def _tem_dado(lista):
    return any(valor is not None for valor in lista or [])


def _ultimo_indice_com_dado(listas):
    ultimo = -1
    for lista in listas:
        for indice in range(len(lista) - 1, ultimo, -1):
            if lista[indice] is not None:
                ultimo = indice
                break
    return ultimo


def _atual_e_15min(latitude, longitude):
    return _buscar({
        'latitude': latitude,
        'longitude': longitude,
        'current': ','.join(VARIAVEIS_HORARIAS),
        'minutely_15': ','.join(VARIAVEIS_15_MIN),
        'past_minutely_15': 24 * 4,  # último dia
        'forecast_minutely_15': 3 * 24 * 4,  # próximos 3 dias
    })


def _modelos(latitude, longitude):
    return _buscar({
        'latitude': latitude,
        'longitude': longitude,
        'hourly': ','.join(VARIAVEIS_HORARIAS),
        'daily': ','.join(VARIAVEIS_DIARIAS),
        'models': ','.join(['best_match'] + [m['id'] for m in MODELOS]),
        'forecast_days': 16,
    })


def _era5(latitude, longitude):
    return _buscar({
        'latitude': latitude,
        'longitude': longitude,
        'hourly': ','.join(VARIAVEIS_ERA5),
        'models': MODELO_ERA5['id'],
        'past_days': 92,
        'forecast_days': 1,
    })


def _vento(latitude, longitude):
    return _buscar({
        'latitude': latitude,
        'longitude': longitude,
        'hourly': 'wind_speed_10m,wind_direction_10m,wind_gusts_10m',
        'forecast_days': 10,
    }, url=FORECAST_URL)


def _normalizar_vento(dados):
    bruto = dados.get('hourly') or {}
    return {
        'tempo': bruto.get('time') or [],
        'velocidade': bruto.get('wind_speed_10m') or [],
        'direcao': bruto.get('wind_direction_10m') or [],
        'rajada': bruto.get('wind_gusts_10m') or [],
        'unidade': (dados.get('hourly_units') or {}).get('wind_speed_10m', 'km/h'),
    }


def _chave_modelo(variavel, modelo):
    # Com vários modelos na mesma chamada, cada variável vem com sufixo
    # (ex.: "wave_height_ecmwf_wam"); o best_match vem como "marine_best_match".
    sufixo = 'marine_best_match' if modelo == 'best_match' else modelo
    return f'{variavel}_{sufixo}'


def _unidades(*respostas):
    """{variavel: unidade} sem o sufixo de modelo — ex.: "wave_height": "m"."""
    sufixos = ['_marine_best_match'] + [f"_{m['id']}" for m in MODELOS + [MODELO_ERA5]]
    unidades = {}
    for dados in respostas:
        for grupo in ('current_units', 'hourly_units', 'daily_units', 'minutely_15_units'):
            for chave, unidade in (dados.get(grupo) or {}).items():
                if unidade in ('undefined', 'iso8601', 'seconds'):
                    continue
                base = next((chave[: -len(s)] for s in sufixos if chave.endswith(s)), chave)
                unidades.setdefault(base, unidade)
    return unidades


def _normalizar_horaria(dados):
    bruto = dados.get('hourly') or {}
    tempo = bruto.get('time') or []

    series = {}
    for modelo in ['best_match'] + [m['id'] for m in MODELOS]:
        variaveis = {}
        for variavel in VARIAVEIS_HORARIAS:
            valores = bruto.get(_chave_modelo(variavel, modelo))
            if _tem_dado(valores):
                variaveis[variavel] = valores
        if variaveis:
            series[modelo] = variaveis

    # Corta as horas do fim em que nenhum modelo tem mais nada.
    fim = _ultimo_indice_com_dado([v for vs in series.values() for v in vs.values()]) + 1
    return {
        'tempo': tempo[:fim],
        'series': {modelo: {var: valores[:fim] for var, valores in vs.items()} for modelo, vs in series.items()},
    }


def _normalizar_diaria(dados):
    bruto = dados.get('daily') or {}
    dias = []
    for indice, data_iso in enumerate(bruto.get('time') or []):
        dia = {'data': data_iso, 'diaSemana': DIAS_SEMANA[date.fromisoformat(data_iso).weekday()], 'fontes': {}}
        for variavel in VARIAVEIS_DIARIAS:
            valor, fonte = None, None
            for modelo in PRIORIDADE_DIARIA:
                lista = bruto.get(_chave_modelo(variavel, modelo)) or []
                if indice < len(lista) and lista[indice] is not None:
                    valor, fonte = lista[indice], modelo
                    break
            dia[variavel] = valor
            if fonte:
                dia['fontes'][variavel] = fonte
        dia['fonte'] = dia['fontes'].get('wave_height_max')
        if dia['fonte']:
            dias.append(dia)
    return dias


def _normalizar_15min(dados):
    bruto = dados.get('minutely_15') or {}
    return {
        'tempo': bruto.get('time') or [],
        **{variavel: bruto.get(variavel) or [] for variavel in VARIAVEIS_15_MIN},
    }


def _normalizar_era5(dados):
    bruto = dados.get('hourly') or {}
    tempo = bruto.get('time') or []
    variaveis = {v: bruto.get(v) or [] for v in VARIAVEIS_ERA5 if _tem_dado(bruto.get(v))}
    fim = _ultimo_indice_com_dado(list(variaveis.values())) + 1
    return {'tempo': tempo[:fim], **{v: valores[:fim] for v, valores in variaveis.items()}}


def buscar_previsao_maritima(latitude, longitude):
    with ThreadPoolExecutor(max_workers=4) as executor:
        futuro_atual = executor.submit(_atual_e_15min, latitude, longitude)
        futuro_modelos = executor.submit(_modelos, latitude, longitude)
        futuro_era5 = executor.submit(_era5, latitude, longitude)
        futuro_vento = executor.submit(_vento, latitude, longitude)
        atual_e_15min = futuro_atual.result()
        modelos = futuro_modelos.result()
        # Histórico e vento são opcionais: se falharem, o resto continua.
        try:
            era5 = futuro_era5.result()
        except requests.RequestException:
            era5 = {}
        try:
            vento = _normalizar_vento(futuro_vento.result())
        except requests.RequestException:
            vento = None

    horaria = _normalizar_horaria(modelos)
    atual = {k: v for k, v in (atual_e_15min.get('current') or {}).items() if k != 'interval'}

    metadados = []
    for modelo in [MODELO_PADRAO] + MODELOS:
        variaveis = horaria['series'].get(modelo['id'], {})
        if not variaveis:
            continue
        horas = max(sum(1 for valor in valores if valor is not None) for valores in variaveis.values())
        metadados.append({**modelo, 'variaveis': list(variaveis), 'horasComDado': horas})

    historico = _normalizar_era5(era5)
    if historico['tempo']:
        metadados.append({
            **MODELO_ERA5,
            'variaveis': [v for v in VARIAVEIS_ERA5 if v in historico],
            'horasComDado': len(historico['tempo']),
        })

    return {
        'grade': {'latitude': modelos.get('latitude'), 'longitude': modelos.get('longitude')},
        'unidades': _unidades(atual_e_15min, modelos, era5),
        'atual': atual,
        'diaria': _normalizar_diaria(modelos),
        'horaria': horaria,
        'quinzeMinutos': _normalizar_15min(atual_e_15min),
        'historico': historico,
        'vento': vento,
        'modelos': metadados,
    }
