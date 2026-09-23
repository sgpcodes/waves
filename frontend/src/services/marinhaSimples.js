// Traduz os números técnicos da previsão marítima em linguagem do dia a
// dia — usado pela aba "Visão simples" (components/marinha/VisaoSimples.jsx).
// Os limites são aproximados, pensados pro litoral do RJ, e servem de
// orientação geral: na praia vale sempre a bandeira do salva-vidas.

import { extremosDeMare } from './marinha'

// Níveis do mar, do mais calmo ao mais perigoso. A cor vem sempre junto
// com ícone e texto (nunca sozinha).
export const NIVEIS_MAR = [
  {
    id: 'calmo',
    titulo: 'Mar calmo',
    frase: 'Ondas pequenas. Bom pra banho e esportes leves.',
    cor: 'var(--status-bom)',
  },
  {
    id: 'moderado',
    titulo: 'Mar moderado',
    frase: 'Ondas de tamanho médio. Dá pra entrar, mas com atenção.',
    cor: 'var(--status-atencao)',
  },
  {
    id: 'agitado',
    titulo: 'Mar agitado',
    frase: 'Ondas fortes. Banho só com muito cuidado e perto do salva-vidas.',
    cor: 'var(--status-serio)',
  },
  {
    id: 'perigoso',
    titulo: 'Mar perigoso',
    frase: 'Ondas grandes e fortes. Evite entrar na água.',
    cor: 'var(--status-critico)',
  },
]

// Nível pela altura da onda. No litoral do RJ, 0,5 m já é mar mexido e
// perto de 1 m já é bastante — a altura é medida da superfície da água pra
// cima, então a onda soma com a profundidade onde a pessoa está. Ondas
// "longas" (que chegam espaçadas, 12 s ou mais) têm mais força que o
// tamanho sugere, e corrente forte puxa quem está na água — os dois sobem
// um nível.
export function nivelDoMar({ altura, periodo, corrente }) {
  if (altura == null) return null
  let indice = altura < 0.5 ? 0 : altura < 0.8 ? 1 : altura < 1.5 ? 2 : 3
  if (periodo != null && periodo >= 12 && altura >= 0.8) indice += 1
  if (corrente != null && corrente >= 2) indice += 1
  return NIVEIS_MAR[Math.min(indice, NIVEIS_MAR.length - 1)]
}

// A altura da onda conta a partir da superfície da água, não da areia.
// Pra comparar com o corpo, considera uma pessoa em pé com água no joelho
// (~0,5 m): a crista da onda chega em 0,5 m + altura.
export const PROFUNDIDADE_REFERENCIA = 0.5

// Até onde a onda chega no corpo de um adulto (~1,70 m) com água no joelho.
export function tamanhoNoCorpo(altura) {
  if (altura == null) return '—'
  const alcance = PROFUNDIDADE_REFERENCIA + altura
  if (alcance < 0.8) return 'na coxa'
  if (alcance < 1.05) return 'na cintura'
  if (alcance < 1.3) return 'no peito'
  if (alcance < 1.5) return 'no ombro'
  if (alcance < 1.75) return 'na cabeça'
  if (alcance < 2.3) return 'acima da cabeça'
  return 'bem acima da cabeça'
}

// Mesma comparação, como frase completa.
export function fraseNoCorpo(altura) {
  if (altura == null) return null
  return `pra quem está com água no joelho, chegam ${tamanhoNoCorpo(altura)}`
}

export function sensacaoAgua(temperatura) {
  if (temperatura == null) return null
  if (temperatura < 20) return 'Fria'
  if (temperatura < 23) return 'Fresquinha'
  if (temperatura < 26) return 'Agradável'
  return 'Quentinha'
}

export function forcaCorrente(kmh) {
  if (kmh == null) return null
  if (kmh < 1) return 'Fraca'
  if (kmh < 2) return 'Moderada'
  return 'Forte'
}

const DIRECOES_POR_EXTENSO = ['norte', 'nordeste', 'leste', 'sudeste', 'sul', 'sudoeste', 'oeste', 'noroeste']

export function direcaoPorExtenso(graus) {
  if (graus == null) return null
  return DIRECOES_POR_EXTENSO[Math.round(graus / 45) % 8]
}

// Maré agora: subindo ou baixando, e quando é a próxima cheia/seca.
export function mareAgora(quinzeMinutos) {
  const { tempo, sea_level_height_msl: niveis } = quinzeMinutos
  if (!tempo?.length) return null
  const agora = new Date()
  const indice = tempo.findIndex((t) => new Date(t) >= agora)
  if (indice < 1 || niveis[indice] == null || niveis[indice - 1] == null) return null
  const subindo = niveis[indice] >= niveis[indice - 1]
  const proximas = extremosDeMare(tempo, niveis).filter((e) => new Date(e.dataHora) >= agora)
  return { subindo, proximas: proximas.slice(0, 4) }
}

// O que dá pra fazer com o mar de agora. Cada atividade volta como
// 'bom' | 'atencao' | 'ruim' + o motivo em uma frase.
export function atividades({ altura, periodo, corrente }) {
  if (altura == null) return []
  const correnteForte = corrente != null && corrente >= 1.5

  const banho =
    altura < 0.5 && !correnteForte
      ? { nivel: 'bom', motivo: 'Ondas pequenas e pouca correnteza.' }
      : altura < 0.8
        ? { nivel: 'atencao', motivo: correnteForte ? 'Correnteza mais forte que o normal.' : 'Ondas médias — fique no raso.' }
        : { nivel: 'ruim', motivo: 'Ondas fortes demais pra banho tranquilo.' }

  const surfe =
    altura < 0.5
      ? { nivel: 'ruim', motivo: 'Ondas pequenas demais pra surfar.' }
      : altura <= 2 && (periodo ?? 0) >= 7
        ? { nivel: 'bom', motivo: 'Ondas de bom tamanho e bem formadas.' }
        : altura <= 2
          ? { nivel: 'atencao', motivo: 'Tem onda, mas curta e bagunçada.' }
          : { nivel: 'atencao', motivo: 'Ondas grandes — só pra quem tem experiência.' }

  const standUp =
    altura < 0.3 && !correnteForte
      ? { nivel: 'bom', motivo: 'Água lisa, fácil de se equilibrar.' }
      : altura < 0.6
        ? { nivel: 'atencao', motivo: 'Um pouco de balanço — fique perto da areia.' }
        : { nivel: 'ruim', motivo: 'Mar mexido demais pra remar.' }

  const barco =
    altura < 0.8
      ? { nivel: 'bom', motivo: 'Mar tranquilo pra passeio.' }
      : altura < 1.5
        ? { nivel: 'atencao', motivo: 'Vai balançar bastante — cuidado com enjoo.' }
        : { nivel: 'ruim', motivo: 'Mar grosso, melhor deixar pra outro dia.' }

  return [
    { id: 'banho', titulo: 'Banho de mar', ...banho },
    { id: 'surfe', titulo: 'Surfe', ...surfe },
    { id: 'standup', titulo: 'Stand-up e caiaque', ...standUp },
    { id: 'barco', titulo: 'Passeio de barco', ...barco },
  ]
}

const TURNOS = [
  { id: 'madrugada', titulo: 'Madrugada', de: 0, ate: 6 },
  { id: 'manha', titulo: 'Manhã', de: 6, ate: 12 },
  { id: 'tarde', titulo: 'Tarde', de: 12, ate: 18 },
  { id: 'noite', titulo: 'Noite', de: 18, ate: 24 },
]

// Hoje e amanhã divididos em turnos, pela maior onda de cada turno — o
// que ainda não passou. Usa o modelo padrão (best_match), hora a hora.
export function turnosProximos(horaria, quantidade = 4) {
  const serie = horaria?.series?.best_match
  if (!serie?.wave_height) return []
  const agora = new Date()
  const grupos = new Map()

  horaria.tempo.forEach((t, i) => {
    const instante = new Date(t)
    if (instante < new Date(agora.getTime() - 60 * 60 * 1000)) return
    const hora = Number(t.slice(11, 13))
    const turno = TURNOS.find((x) => hora >= x.de && hora < x.ate)
    const chave = `${t.slice(0, 10)}-${turno.id}`
    const grupo = grupos.get(chave) ?? { chave, data: t.slice(0, 10), turno, alturas: [], periodos: [], correntes: [] }
    if (serie.wave_height[i] != null) grupo.alturas.push(serie.wave_height[i])
    if (serie.wave_period?.[i] != null) grupo.periodos.push(serie.wave_period[i])
    if (serie.ocean_current_velocity?.[i] != null) grupo.correntes.push(serie.ocean_current_velocity[i])
    grupos.set(chave, grupo)
  })

  return Array.from(grupos.values())
    .filter((g) => g.alturas.length && g.turno.id !== 'madrugada')
    .slice(0, quantidade)
    .map((g) => {
      const altura = Math.max(...g.alturas)
      const periodo = g.periodos.length ? Math.max(...g.periodos) : null
      const corrente = g.correntes.length ? Math.max(...g.correntes) : null
      return { ...g, altura, nivel: nivelDoMar({ altura, periodo, corrente }) }
    })
}
