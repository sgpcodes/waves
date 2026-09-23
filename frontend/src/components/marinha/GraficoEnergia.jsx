import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  ESCALA_POTENCIA,
  corDaPotencia,
  direcaoComArtigo,
  direcaoTexto,
  formatarValor,
  mediaDirecoes,
} from '../../services/marinha'
import styles from './GraficoEnergia.module.css'

const DIAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
const VAO = 3 // px entre as barras
const LARGURA_MINIMA_COLUNA = 11 // px por coluna de 3 h

// Componentes de onda que viram abas. Os swells ganham o nome pela direção
// de onde vêm ("Swell do Sul"), calculada no período mostrado.
const COMPONENTES = [
  { prefixo: 'wave', rotulo: 'Total' },
  { prefixo: 'wind_wave', rotulo: 'Vagas' },
  { prefixo: 'swell_wave', rotulo: 'Swell' },
  { prefixo: 'secondary_swell_wave', rotulo: 'Swell' },
  { prefixo: 'tertiary_swell_wave', rotulo: 'Swell' },
]

function ehNoite(hora) {
  return hora < 6 || hora >= 18
}

function rotuloDia(dataHora) {
  const data = new Date(`${dataHora.slice(0, 10)}T12:00:00`)
  return `${DIAS_SEMANA[data.getDay()]} ${dataHora.slice(8, 10)}`
}

function TooltipEnergia({ active, payload }) {
  if (!active || !payload?.length) return null
  const c = payload[0].payload
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipTitulo}>
        {rotuloDia(c.t)} · {c.t.slice(11, 13)}h
      </span>
      <strong className={styles.tooltipValor}>{formatarValor(c.energia, 'J/m²', 0)}</strong>
      <span className={styles.tooltipLinha}>
        <span className={styles.tooltipCor} style={{ backgroundColor: corDaPotencia(c.potencia) }} />
        Potência {formatarValor(c.potencia, 'kW/m', 1)}
      </span>
      <span>
        Onda {formatarValor(c.altura, 'm', 1)} · {formatarValor(c.periodo, 's', 0)} · de {direcaoTexto(c.direcao)}
      </span>
    </div>
  )
}

// Gráfico de energia das ondas, no estilo dos sites de surfe: altura da
// barra = energia (J/m²), cor = potência (kW/m), de 3 em 3 horas, com
// faixas de noite mais escuras e uma aba por componente (total, vagas,
// swells). Usa o modelo padrão (best_match).
function GraficoEnergia({ horaria, dias = 7 }) {
  const serie = horaria?.series?.best_match ?? {}

  // Colunas: de hoje 00h até `dias` dias depois, de 3 em 3 horas.
  const indices = useMemo(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const fim = new Date(hoje)
    fim.setDate(fim.getDate() + dias)
    return horaria.tempo
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => {
        const instante = new Date(t)
        return instante >= hoje && instante < fim && Number(t.slice(11, 13)) % 3 === 0
      })
  }, [horaria, dias])

  // Abas só dos componentes que têm energia nesse período.
  const abas = useMemo(() => {
    const lista = COMPONENTES.filter((c) => indices.some(({ i }) => serie[`${c.prefixo}_energy`]?.[i] != null))
    const usados = new Map()
    return lista.map((c) => {
      let rotulo = c.rotulo
      if (c.rotulo === 'Swell') {
        const direcao = mediaDirecoes(indices.map(({ i }) => serie[`${c.prefixo}_direction`]?.[i]))
        rotulo = `Swell ${direcaoComArtigo(direcao)}`.trim()
        const vezes = (usados.get(rotulo) ?? 0) + 1
        usados.set(rotulo, vezes)
        if (vezes > 1) rotulo = `${rotulo} (${vezes})`
      }
      return { ...c, rotulo }
    })
  }, [indices, serie])

  const [componente, setComponente] = useState('wave')
  const ativo = abas.some((a) => a.prefixo === componente) ? componente : 'wave'

  const dados = useMemo(
    () =>
      indices.map(({ t, i }) => ({
        t,
        hora: Number(t.slice(11, 13)),
        energia: serie[`${ativo}_energy`]?.[i] ?? null,
        potencia: serie[`${ativo}_power`]?.[i] ?? null,
        altura: serie[`${ativo}_height`]?.[i] ?? null,
        periodo: serie[`${ativo}_period`]?.[i] ?? null,
        direcao: serie[`${ativo}_direction`]?.[i] ?? null,
      })),
    [indices, serie, ativo],
  )

  const meioDosDias = dados.filter((c) => c.hora === 12).map((c) => c.t)
  const agora = useMemo(() => {
    const instante = new Date()
    return dados.reduce((ultimo, c) => (new Date(c.t) <= instante ? c.t : ultimo), null)
  }, [dados])

  if (!dados.length) return null

  // Eixo Y em números redondos: de 500 em 500 J até 2.000, depois de 1.000.
  const maximo = Math.max(0, ...dados.map((c) => c.energia ?? 0))
  const passo = maximo <= 2000 ? 500 : 1000
  const topo = Math.max(passo, Math.ceil(maximo / passo) * passo)
  const ticksY = Array.from({ length: topo / passo + 1 }, (_, i) => i * passo)

  // Fundo de cada coluna: mais escuro à noite (como nos sites de surfe), e
  // uma divisória escura na borda esquerda da coluna das 00h (início do dia).
  function fundoDaColuna({ x, y, width, height, index }) {
    const coluna = dados[index]
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={ehNoite(coluna.hora) ? 'var(--energia-noite)' : 'var(--energia-dia)'} />
        {coluna.hora === 0 && index > 0 && <rect x={x - 1} y={y} width={2} height={height} fill="rgba(0,0,0,0.55)" />}
      </g>
    )
  }

  // A coluna ocupa a faixa inteira (pro fundo não ter frestas); a barra é
  // desenhada um pouco mais estreita dentro dela.
  function barra({ x, y, width, height, fill }) {
    if (!height || height <= 0) return null
    return <rect x={x + VAO / 2} y={y} width={Math.max(1, width - VAO)} height={height} rx={2} fill={fill} />
  }

  const rotulosEscala = [0, 4, 10, 20, 30, 50, 80, 100]

  return (
    <div className={styles.grafico}>
      <div className={styles.abas} role="tablist" aria-label="Componente da onda">
        {abas.map((aba) => (
          <button
            key={aba.prefixo}
            type="button"
            role="tab"
            aria-selected={aba.prefixo === ativo}
            className={`${styles.aba} ${aba.prefixo === ativo ? styles.abaAtiva : ''}`}
            onClick={() => setComponente(aba.prefixo)}
          >
            {aba.rotulo}
          </button>
        ))}
      </div>

      {/* No celular o gráfico rola de lado: cada coluna tem uma largura mínima
          pra barra não virar um risco. */}
      <div className={styles.area}>
        <div style={{ minWidth: dados.length * LARGURA_MINIMA_COLUNA + 70 }}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dados} margin={{ top: 4, right: 12, bottom: 4, left: 4 }} barCategoryGap={0}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.35)" strokeDasharray="4 4" />
              <XAxis
                dataKey="t"
                orientation="top"
                ticks={meioDosDias}
                tickFormatter={rotuloDia}
                interval={0}
                tick={{ fontSize: 12, fontWeight: 700, fill: 'var(--energia-texto)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                width={64}
                domain={[0, topo]}
                ticks={ticksY}
                tickFormatter={(v) => `${v.toLocaleString('pt-BR')} J`}
                tick={{ fontSize: 11, fill: 'var(--energia-texto)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<TooltipEnergia />} cursor={{ fill: 'rgba(255,255,255,0.12)' }} />
              {agora && <ReferenceLine x={agora} stroke="#fff" strokeWidth={1.5} strokeDasharray="3 3" />}
              <Bar dataKey="energia" name="Energia" background={fundoDaColuna} shape={barra} isAnimationActive={false}>
                {dados.map((c) => (
                  <Cell key={c.t} fill={corDaPotencia(c.potencia)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.legenda}>
        <p>
          <strong>Altura das barras:</strong> energia das ondas, em Joules por m².
        </p>
        <p>
          <strong>Cor das barras:</strong> potência das ondas, em Kilowatts por metro (kW/m).
        </p>
        <div className={styles.escala} aria-hidden="true">
          {ESCALA_POTENCIA.map((faixa) => (
            <span key={faixa.ate} style={{ backgroundColor: faixa.cor }} />
          ))}
        </div>
        <div className={styles.escalaRotulos}>
          {rotulosEscala.map((valor) => (
            <span key={valor}>{valor}</span>
          ))}
          <span>kW/m</span>
        </div>
        <p className={styles.nota}>
          Energia e potência são calculadas a partir da altura e do período de cada componente (a API não fornece esses
          dados). Faixas escuras = noite. Linha tracejada branca = agora.
        </p>
      </div>
    </div>
  )
}

export default GraficoEnergia
