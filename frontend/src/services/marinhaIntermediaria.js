// Regras da aba "Visão intermediária" (estilo Surfguru): grade de 3 em 3
// horas, vento terral/maral e resumo por dia.
// Usa o modelo padrão (best_match) pras ondas e o vento da Forecast API.

// Horário com luz usado nos resumos (em setembro o sol nasce ~5h40 e se
// põe ~17h45 no RJ).
export const HORA_INICIO_DIA = 6
export const HORA_FIM_DIA = 17

// Diferença entre dois ângulos, de 0 a 180°.
function diferencaAngular(a, b) {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

// Terral = vento soprando da terra pro mar (deixa a onda lisa, bom pro
// surfe). Maral = do mar pra terra (bagunça a onda). `orientacao` é pra
// onde a praia olha; o vento terral vem do lado oposto.
export function tipoVento(direcao, orientacao, velocidade) {
  if (direcao == null || velocidade == null) return null
  if (velocidade < 5) return { id: 'fraco', rotulo: 'Fraco', cor: 'var(--status-bom)' }
  if (orientacao == null) return null
  const vindoDaTerra = (orientacao + 180) % 360
  const diferenca = diferencaAngular(direcao, vindoDaTerra)
  if (diferenca <= 45) return { id: 'terral', rotulo: 'Terral', cor: 'var(--status-bom)' }
  if (diferenca >= 135) return { id: 'maral', rotulo: 'Maral', cor: 'var(--status-serio)' }
  return { id: 'lateral', rotulo: 'Lateral', cor: 'var(--status-atencao)' }
}

// Escala sequencial (um tom de azul, do claro pro escuro) pro fundo da
// célula de altura de onda — e se o texto em cima precisa ser branco.
const FAIXAS_ONDA = [
  { ate: 0.5, fundo: '#cde2fb', textoClaro: false },
  { ate: 1, fundo: '#9ec5f4', textoClaro: false },
  { ate: 1.5, fundo: '#6da7ec', textoClaro: false },
  { ate: 2, fundo: '#3987e5', textoClaro: true },
  { ate: 2.5, fundo: '#256abf', textoClaro: true },
  { ate: Infinity, fundo: '#184f95', textoClaro: true },
]

export const LEGENDA_ONDA = [
  { rotulo: '< 0,5 m', ...FAIXAS_ONDA[0] },
  { rotulo: '0,5–1 m', ...FAIXAS_ONDA[1] },
  { rotulo: '1–1,5 m', ...FAIXAS_ONDA[2] },
  { rotulo: '1,5–2 m', ...FAIXAS_ONDA[3] },
  { rotulo: '2–2,5 m', ...FAIXAS_ONDA[4] },
  { rotulo: '> 2,5 m', ...FAIXAS_ONDA[5] },
]

export function corDaOnda(altura) {
  if (altura == null) return null
  return FAIXAS_ONDA.find((faixa) => altura < faixa.ate)
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function diaCurto(dataISO) {
  const data = new Date(`${dataISO}T12:00:00`)
  return `${DIAS_SEMANA[data.getDay()]} ${dataISO.slice(8, 10)}/${dataISO.slice(5, 7)}`
}

// Uma linha por hora juntando onda (best_match), vento e maré, com o tipo
// de vento já calculado. É a base da grade e dos gráficos.
export function montarHoras(previsao) {
  const { horaria, vento, ponto } = previsao
  const serie = horaria?.series?.best_match ?? {}
  const ventoPorHora = new Map((vento?.tempo ?? []).map((t, i) => [t, i]))

  return horaria.tempo
    .map((t, i) => {
      const altura = serie.wave_height?.[i] ?? null
      if (altura == null) return null
      const iv = ventoPorHora.get(t)
      const velocidade = iv != null ? vento.velocidade[iv] : null
      const direcaoVento = iv != null ? vento.direcao[iv] : null
      const tipo = tipoVento(direcaoVento, ponto.orientacao, velocidade)
      return {
        t,
        data: t.slice(0, 10),
        hora: Number(t.slice(11, 13)),
        altura,
        periodo: serie.wave_period?.[i] ?? null,
        direcao: serie.wave_direction?.[i] ?? null,
        swellAltura: serie.swell_wave_height?.[i] ?? null,
        swellPeriodo: serie.swell_wave_period?.[i] ?? null,
        swellDirecao: serie.swell_wave_direction?.[i] ?? null,
        swell2Altura: serie.secondary_swell_wave_height?.[i] ?? null,
        swell2Periodo: serie.secondary_swell_wave_period?.[i] ?? null,
        swell2Direcao: serie.secondary_swell_wave_direction?.[i] ?? null,
        ventoOndaAltura: serie.wind_wave_height?.[i] ?? null,
        mare: serie.sea_level_height_msl?.[i] ?? null,
        agua: serie.sea_surface_temperature?.[i] ?? null,
        vento: velocidade,
        ventoDirecao: direcaoVento,
        rajada: iv != null ? vento.rajada[iv] : null,
        tipoVento: tipo,
      }
    })
    .filter(Boolean)
}

// Colunas da grade: de 3 em 3 horas, a partir da hora atual, por `dias`
// dias. Com `soDia`, só o horário com luz (6h–17h). Agrupa por dia pro cabeçalho.
export function montarGrade(horas, { dias = 7, soDia = true } = {}) {
  const agora = new Date()
  agora.setMinutes(0, 0, 0)
  const inicio = new Date(agora)
  inicio.setHours(Math.floor(agora.getHours() / 3) * 3)
  const limite = new Date(inicio)
  limite.setDate(limite.getDate() + dias)

  const colunas = horas.filter((h) => {
    const instante = new Date(h.t)
    if (instante < inicio || instante >= limite) return false
    if (h.hora % 3 !== 0) return false
    return !soDia || (h.hora >= HORA_INICIO_DIA && h.hora <= HORA_FIM_DIA)
  })

  const grupos = []
  colunas.forEach((coluna) => {
    const ultimo = grupos.at(-1)
    if (ultimo?.data === coluna.data) ultimo.colunas.push(coluna)
    else grupos.push({ data: coluna.data, rotulo: diaCurto(coluna.data), colunas: [coluna] })
  })
  return grupos
}

function mediaCircular(graus) {
  const validos = graus.filter((g) => g != null)
  if (!validos.length) return null
  const seno = validos.reduce((s, g) => s + Math.sin((g * Math.PI) / 180), 0)
  const cosseno = validos.reduce((s, g) => s + Math.cos((g * Math.PI) / 180), 0)
  return ((Math.atan2(seno, cosseno) * 180) / Math.PI + 360) % 360
}

function faixa(valores) {
  const validos = valores.filter((v) => v != null)
  return validos.length ? { min: Math.min(...validos), max: Math.max(...validos) } : null
}

function maisFrequente(itens) {
  const contagem = new Map()
  itens.filter(Boolean).forEach((item) => {
    const atual = contagem.get(item.id) ?? { item, total: 0 }
    atual.total += 1
    contagem.set(item.id, atual)
  })
  return Array.from(contagem.values()).sort((a, b) => b.total - a.total)[0]?.item ?? null
}

// Resumo de cada dia, tudo sobre o MESMO período (das 6h às 17h, com luz):
// faixa de onda, faixa de período, direção predominante da ondulação e
// vento (faixa, direção e tipo predominantes).
export function resumoPorDia(horas, dias = 10) {
  const porDia = new Map()
  horas.forEach((h) => {
    if (h.hora < HORA_INICIO_DIA || h.hora > HORA_FIM_DIA) return
    const lista = porDia.get(h.data) ?? []
    lista.push(h)
    porDia.set(h.data, lista)
  })

  const hojeISO = new Date().toLocaleDateString('sv-SE')
  return Array.from(porDia.entries())
    .filter(([data]) => data >= hojeISO)
    .slice(0, dias)
    .map(([data, lista]) => {
      const temVento = lista.some((h) => h.vento != null)

      return {
        data,
        rotulo: diaCurto(data),
        onda: faixa(lista.map((h) => h.altura)),
        periodo: faixa(lista.map((h) => h.swellPeriodo ?? h.periodo)),
        direcao: mediaCircular(lista.map((h) => h.swellDirecao ?? h.direcao)),
        vento: temVento ? faixa(lista.map((h) => h.vento)) : null,
        ventoDirecao: temVento ? mediaCircular(lista.map((h) => h.ventoDirecao)) : null,
        ventoTipo: temVento ? maisFrequente(lista.map((h) => h.tipoVento)) : null,
      }
    })
}
