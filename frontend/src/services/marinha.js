// Nomes, cores e formatação da previsão marítima (Open-Meteo Marine,
// via backend — ver backend/clima/marinha.py).

// Nome em português de cada variável da API.
export const ROTULO_VARIAVEL = {
  wave_height: 'Altura de onda',
  wave_direction: 'Direção da onda',
  wave_period: 'Período da onda',
  wave_peak_period: 'Período de pico',
  wave_energy: 'Energia das ondas',
  wave_power: 'Potência das ondas',
  wind_wave_height: 'Onda de vento — altura',
  wind_wave_direction: 'Onda de vento — direção',
  wind_wave_period: 'Onda de vento — período',
  wind_wave_peak_period: 'Onda de vento — período de pico',
  swell_wave_height: 'Swell primário — altura',
  swell_wave_direction: 'Swell primário — direção',
  swell_wave_period: 'Swell primário — período',
  swell_wave_peak_period: 'Swell primário — período de pico',
  secondary_swell_wave_height: 'Swell secundário — altura',
  secondary_swell_wave_period: 'Swell secundário — período',
  secondary_swell_wave_direction: 'Swell secundário — direção',
  tertiary_swell_wave_height: 'Swell terciário — altura',
  tertiary_swell_wave_period: 'Swell terciário — período',
  tertiary_swell_wave_direction: 'Swell terciário — direção',
  sea_level_height_msl: 'Nível do mar',
  sea_surface_temperature: 'Temperatura da água',
  ocean_current_velocity: 'Velocidade da corrente',
  ocean_current_direction: 'Direção da corrente',
  invert_barometer_height: 'Efeito barômetro inverso',
}

// Nome curto pra cabeçalho de tabela.
export const ROTULO_CURTO = {
  wave_height: 'Onda',
  wave_direction: 'Dir. onda',
  wave_period: 'Período',
  wave_peak_period: 'Pico',
  wave_energy: 'Energia',
  wave_power: 'Potência',
  wind_wave_height: 'Vento alt.',
  wind_wave_direction: 'Vento dir.',
  wind_wave_period: 'Vento per.',
  wind_wave_peak_period: 'Vento pico',
  swell_wave_height: 'Swell alt.',
  swell_wave_direction: 'Swell dir.',
  swell_wave_period: 'Swell per.',
  swell_wave_peak_period: 'Swell pico',
  secondary_swell_wave_height: 'Swell 2 alt.',
  secondary_swell_wave_period: 'Swell 2 per.',
  secondary_swell_wave_direction: 'Swell 2 dir.',
  tertiary_swell_wave_height: 'Swell 3 alt.',
  tertiary_swell_wave_period: 'Swell 3 per.',
  tertiary_swell_wave_direction: 'Swell 3 dir.',
  sea_level_height_msl: 'Nível',
  sea_surface_temperature: 'Água',
  ocean_current_velocity: 'Corrente',
  ocean_current_direction: 'Dir. corrente',
  invert_barometer_height: 'Barôm. inv.',
}

// Cor fixa por modelo (tokens --modelo-N em theme.css). O best_match não
// entra no gráfico de comparação — ele é uma mistura dos outros.
export const COR_MODELO = {
  meteofrance_wave: 'var(--modelo-1)',
  meteofrance_currents: 'var(--modelo-2)',
  ecmwf_wam: 'var(--modelo-3)',
  ecmwf_wam025: 'var(--modelo-4)',
  ncep_gfswave025: 'var(--modelo-5)',
  dwd_gwam: 'var(--modelo-6)',
}

export const NOME_CURTO_MODELO = {
  best_match: 'Padrão',
  meteofrance_wave: 'MeteoFrance',
  meteofrance_currents: 'MF Currents',
  ecmwf_wam: 'ECMWF',
  ecmwf_wam025: 'ECMWF 0,25°',
  ncep_gfswave025: 'GFS',
  dwd_gwam: 'DWD',
}

// Escala de cores da potência das ondas (kW por metro de crista), do azul
// (fraca) ao magenta (muito forte) — usada nas barras do gráfico de energia.
// Energia e potência são calculadas no backend a partir da altura e do
// período (a Marine API não fornece esses dados).
export const ESCALA_POTENCIA = [
  { ate: 1, cor: '#3d6fc2' },
  { ate: 2, cor: '#4f9be0' },
  { ate: 4, cor: '#5cc6ee' },
  { ate: 6, cor: '#6fe6f2' },
  { ate: 8, cor: '#78f2d4' },
  { ate: 10, cor: '#7ef0a6' },
  { ate: 13, cor: '#7cec72' },
  { ate: 16, cor: '#a4ee58' },
  { ate: 20, cor: '#cdf24f' },
  { ate: 25, cor: '#f4f455' },
  { ate: 30, cor: '#f7d448' },
  { ate: 40, cor: '#f4ae3e' },
  { ate: 50, cor: '#ef8a33' },
  { ate: 65, cor: '#e75b27' },
  { ate: 80, cor: '#d93030' },
  { ate: 100, cor: '#b92a6a' },
  { ate: Infinity, cor: '#d93fd6' },
]

export function corDaPotencia(kwm) {
  if (kwm == null) return '#8fa3ad'
  return ESCALA_POTENCIA.find((faixa) => kwm < faixa.ate).cor
}

const DIRECAO_COM_ARTIGO = [
  'do Norte', 'de Nordeste', 'de Leste', 'de Sudeste', 'do Sul', 'de Sudoeste', 'de Oeste', 'de Noroeste',
]

// "do Sul", "de Sudeste"... pra nomear um swell pela direção de onde vem.
export function direcaoComArtigo(graus) {
  if (graus == null) return ''
  return DIRECAO_COM_ARTIGO[Math.round(graus / 45) % 8]
}

// Média de direções em graus (vetorial: a média de 350° e 10° é 0°).
export function mediaDirecoes(graus) {
  const validos = graus.filter((g) => g != null)
  if (!validos.length) return null
  const seno = validos.reduce((soma, g) => soma + Math.sin((g * Math.PI) / 180), 0)
  const cosseno = validos.reduce((soma, g) => soma + Math.cos((g * Math.PI) / 180), 0)
  return ((Math.atan2(seno, cosseno) * 180) / Math.PI + 360) % 360
}

export function ehDirecao(variavel) {
  return variavel.includes('direction')
}

const PONTOS_CARDEAIS = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO']

export function direcaoTexto(graus) {
  if (graus == null) return '—'
  return PONTOS_CARDEAIS[Math.round(graus / 45) % 8]
}

// Onda: a API dá a direção DE ONDE vem (convenção meteorológica), então a
// seta aponta pra onde ela vai (+180°). Corrente: a API já dá PRA ONDE vai.
export function rotacaoSeta(variavel, graus) {
  if (graus == null) return null
  return variavel === 'ocean_current_direction' ? graus : (graus + 180) % 360
}

export function formatarValor(valor, unidade, casas = 1) {
  if (valor == null) return '—'
  const numero = Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas })
  if (!unidade) return numero
  return unidade === '°' || unidade === '°C' ? `${numero}${unidade}` : `${numero} ${unidade}`
}

export function formatarDataHora(dataHoraISO) {
  if (!dataHoraISO) return '—'
  return `${dataHoraISO.slice(8, 10)}/${dataHoraISO.slice(5, 7)} ${dataHoraISO.slice(11, 16)}`
}

export function formatarData(dataISO) {
  return dataISO ? `${dataISO.slice(8, 10)}/${dataISO.slice(5, 7)}` : '—'
}

export function formatarHora(dataHoraISO) {
  return dataHoraISO ? dataHoraISO.slice(11, 16) : '—'
}

// Índice da primeira hora >= agora (as horas vêm no fuso de São Paulo, sem
// offset — `new Date` lê no fuso do navegador, que no Brasil bate).
export function indiceAgora(tempos) {
  const agora = new Date()
  agora.setMinutes(0, 0, 0)
  const indice = tempos.findIndex((t) => new Date(t) >= agora)
  return indice === -1 ? 0 : indice
}

// Preamar/baixa-mar: máximos e mínimos locais da série de nível do mar
// (15 em 15 min). Janela de ±2 h pra não pegar oscilação pequena como maré.
export function extremosDeMare(tempos, niveis) {
  const janela = 8
  const extremos = []
  for (let i = janela; i < niveis.length - janela; i += 1) {
    const valor = niveis[i]
    if (valor == null) continue
    const vizinhos = niveis.slice(i - janela, i + janela + 1).filter((v) => v != null)
    const ehMaximo = vizinhos.every((v) => v <= valor) && niveis[i - 1] !== valor
    const ehMinimo = vizinhos.every((v) => v >= valor) && niveis[i - 1] !== valor
    if (ehMaximo) extremos.push({ tipo: 'alta', dataHora: tempos[i], nivel: valor })
    else if (ehMinimo) extremos.push({ tipo: 'baixa', dataHora: tempos[i], nivel: valor })
  }
  return extremos
}
