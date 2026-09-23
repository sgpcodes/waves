// Caminho reserva: busca a previsão do tempo direto da Open-Meteo pelo
// navegador de quem está usando o site.
//
// Por quê: servidores gratuitos (como o do Render) dividem o mesmo IP com
// muitos outros sites, e a cota gratuita da Open-Meteo é por IP — então a
// chamada feita pelo backend pode ser recusada. Pelo navegador, cada pessoa
// usa a própria cota. O formato devolvido é o mesmo do backend
// (backend/clima/servicos.py -> normalizar_clima), então o resto da página
// não precisa saber de onde veio.

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const FUSO = 'America/Sao_Paulo'

const DESCRICAO_POR_CODIGO = {
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

const CODIGOS_CHUVA = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86])
const CODIGOS_TEMPESTADE = new Set([95, 96, 99])
const CODIGOS_NUBLADO = new Set([3, 45, 48])
const PONTOS_CARDEAIS = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO']
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function descricaoTempo(codigo) {
  return DESCRICAO_POR_CODIGO[codigo] ?? 'Condição indisponível'
}

function condicaoPorCodigo(codigo) {
  if (codigo == null) return 'sol'
  if (CODIGOS_TEMPESTADE.has(codigo)) return 'tempestade'
  if (CODIGOS_CHUVA.has(codigo)) return 'chuva'
  if (CODIGOS_NUBLADO.has(codigo)) return 'nublado'
  if (codigo === 2) return 'parcialmente-nublado'
  return 'sol'
}

function direcaoTexto(graus) {
  if (graus == null) return '—'
  return PONTOS_CARDEAIS[Math.round(graus / 45) % 8]
}

function intensidadeVento(kmh) {
  if (kmh == null) return '—'
  if (kmh < 20) return 'Fraco'
  if (kmh < 40) return 'Moderado'
  return 'Forte'
}

function item(lista, indice) {
  return lista?.[indice] ?? null
}

async function buscar(parametros) {
  const resposta = await fetch(`${FORECAST_URL}?${new URLSearchParams({ ...parametros, timezone: FUSO })}`)
  if (!resposta.ok) throw new Error(`Open-Meteo respondeu ${resposta.status}`)
  return resposta.json()
}

// Mesmo formato de /api/clima/ do backend.
export async function buscarClimaNoNavegador({ latitude, longitude }) {
  const dados = await buscar({
    latitude,
    longitude,
    current: 'temperature_2m,precipitation,weather_code,dew_point_2m,uv_index,visibility',
    hourly: 'temperature_2m,precipitation_probability,weather_code',
    daily: [
      'sunrise',
      'sunset',
      'precipitation_probability_max',
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'wind_speed_10m_max',
      'wind_direction_10m_dominant',
    ].join(','),
    forecast_days: 15,
  })

  const atual = dados.current ?? {}
  const diaria = dados.daily ?? {}
  const horaria = dados.hourly ?? {}
  const hojeISO = (atual.time ?? '').slice(0, 10)
  const datas = diaria.time ?? []
  const busca = datas.findIndex((d) => d >= hojeISO)
  const indiceHoje = busca === -1 ? 0 : busca

  const previsaoDiaria = datas.slice(indiceHoje).map((data, relativo) => {
    const i = indiceHoje + relativo
    const codigo = item(diaria.weather_code, i)
    const ventoMax = item(diaria.wind_speed_10m_max, i)
    return {
      data,
      diaSemana: DIAS_SEMANA[new Date(`${data}T12:00:00`).getDay()],
      tempMax: item(diaria.temperature_2m_max, i),
      tempMin: item(diaria.temperature_2m_min, i),
      chuvaProbabilidade: item(diaria.precipitation_probability_max, i),
      weatherCode: codigo,
      condicao: condicaoPorCodigo(codigo),
      condicaoTexto: descricaoTempo(codigo),
      ventoVelocidade: ventoMax,
      ventoDirecaoTexto: direcaoTexto(item(diaria.wind_direction_10m_dominant, i)),
      ventoIntensidade: intensidadeVento(ventoMax),
    }
  })

  const previsaoHoraria = (horaria.time ?? []).map((dataHora, i) => ({
    dataHora,
    data: dataHora.slice(0, 10),
    temperatura: item(horaria.temperature_2m, i),
    chuvaProbabilidade: item(horaria.precipitation_probability, i),
    condicao: condicaoPorCodigo(item(horaria.weather_code, i)),
  }))

  return {
    atualizadoEm: atual.time ?? null,
    temperatura: atual.temperature_2m ?? null,
    pontoDeOrvalho: atual.dew_point_2m ?? null,
    indiceUV: atual.uv_index ?? null,
    precipitacao: atual.precipitation ?? null,
    visibilidadeKm: atual.visibility != null ? Number((atual.visibility / 1000).toFixed(1)) : null,
    condicao: condicaoPorCodigo(atual.weather_code),
    condicaoTexto: descricaoTempo(atual.weather_code),
    nascerSol: item(diaria.sunrise, indiceHoje),
    porSol: item(diaria.sunset, indiceHoje),
    previsaoDiaria,
    previsaoHoraria,
  }
}

// Mesmo formato do campo `vento` de /api/marinha/ do backend.
export async function buscarVentoNoNavegador({ latitude, longitude }) {
  const dados = await buscar({
    latitude,
    longitude,
    hourly: 'wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    forecast_days: 10,
  })
  const horaria = dados.hourly ?? {}
  return {
    tempo: horaria.time ?? [],
    velocidade: horaria.wind_speed_10m ?? [],
    direcao: horaria.wind_direction_10m ?? [],
    rajada: horaria.wind_gusts_10m ?? [],
    unidade: dados.hourly_units?.wind_speed_10m ?? 'km/h',
  }
}
