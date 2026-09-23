import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import TooltipGrafico from './TooltipGrafico'
import { COR_MODELO, ROTULO_VARIAVEL, ehDirecao, formatarDataHora, indiceAgora } from '../../services/marinha'
import styles from './PrevisaoMaritima.module.css'

function rotuloEixo(dataHora) {
  return `${dataHora.slice(8, 10)}/${dataHora.slice(5, 7)}`
}

// Mesma variável em todos os modelos que a têm, lado a lado, hora a hora.
// Direção fica de fora (0° e 360° são o mesmo lugar, a linha "pularia") —
// ela aparece na tabela hora a hora.
function ComparacaoModelos({ horaria, modelos, unidades }) {
  const modelosComparaveis = useMemo(() => modelos.filter((m) => COR_MODELO[m.id]), [modelos])

  const variaveis = useMemo(() => {
    const disponiveis = new Set(modelosComparaveis.flatMap((m) => m.variaveis))
    return Object.keys(ROTULO_VARIAVEL).filter((v) => disponiveis.has(v) && !ehDirecao(v))
  }, [modelosComparaveis])

  const [variavel, setVariavel] = useState('wave_height')
  const variavelAtiva = variaveis.includes(variavel) ? variavel : variaveis[0]
  const modelosDaVariavel = useMemo(
    () => modelosComparaveis.filter((m) => horaria.series[m.id]?.[variavelAtiva]),
    [modelosComparaveis, horaria, variavelAtiva],
  )

  const dados = useMemo(
    () =>
      horaria.tempo.map((t, i) => {
        const ponto = { t }
        modelosDaVariavel.forEach((m) => {
          ponto[m.id] = horaria.series[m.id][variavelAtiva][i]
        })
        return ponto
      }),
    [horaria, modelosDaVariavel, variavelAtiva],
  )

  const agora = horaria.tempo[indiceAgora(horaria.tempo)]
  // Um tick por dia (meia-noite) — com minTickGap sozinho o eixo repetia
  // a mesma data em horas diferentes do dia.
  const ticksDiarios = useMemo(() => horaria.tempo.filter((t) => t.endsWith('T00:00')), [horaria])
  const unidade = unidades[variavelAtiva]

  if (!variavelAtiva) return null

  return (
    <div className={styles.bloco}>
      <div className={styles.blocoCabecalho}>
        <h3 className={styles.blocoTitulo}>Comparação entre modelos</h3>
        <span className={styles.blocoNota}>Hora a hora · até 16 dias</span>
      </div>

      <div className={styles.chips} role="group" aria-label="Variável">
        {variaveis.map((v) => (
          <button
            key={v}
            type="button"
            className={`${styles.chipBotao} ${v === variavelAtiva ? styles.chipBotaoAtivo : ''}`}
            onClick={() => setVariavel(v)}
          >
            {ROTULO_VARIAVEL[v]}
          </button>
        ))}
      </div>

      <figure className={styles.figura}>
        <figcaption className={styles.figuraTitulo}>
          {ROTULO_VARIAVEL[variavelAtiva]}
          {unidade ? ` (${unidade})` : ''}
        </figcaption>
        {modelosDaVariavel.length > 1 && (
          <ul className={styles.legenda}>
            {modelosDaVariavel.map((m) => (
              <li key={m.id}>
                <span className={styles.legendaTraco} style={{ backgroundColor: COR_MODELO[m.id] }} />
                {m.nome}
              </li>
            ))}
          </ul>
        )}
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--color-grid)" />
            <XAxis dataKey="t" ticks={ticksDiarios} interval="preserveStartEnd" tickFormatter={rotuloEixo} minTickGap={24} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} stroke="var(--color-grid)" />
            <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} stroke="var(--color-grid)" />
            <Tooltip content={<TooltipGrafico formatarRotulo={formatarDataHora} unidade={unidade} />} />
            {agora && <ReferenceLine x={agora} stroke="var(--color-text-secondary)" strokeDasharray="3 3" label={{ value: 'Agora', fontSize: 11, fill: 'var(--color-text-secondary)', position: 'insideTopLeft' }} />}
            {modelosDaVariavel.map((m) => (
              <Line
                key={m.id}
                type="monotone"
                dataKey={m.id}
                name={m.nome}
                stroke={COR_MODELO[m.id]}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </figure>
    </div>
  )
}

export default ComparacaoModelos
