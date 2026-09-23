import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import TooltipGrafico from './TooltipGrafico'
import { formatarData, formatarValor } from '../../services/marinha'
import styles from './PrevisaoMaritima.module.css'

// Agrupa o ERA5 hora a hora em dias: altura máxima e média, e o período
// médio (vai só no resumo — é outra unidade, não entra no mesmo eixo).
function agruparPorDia(historico) {
  const porDia = new Map()
  historico.tempo.forEach((t, i) => {
    const dia = t.slice(0, 10)
    const grupo = porDia.get(dia) ?? { alturas: [], periodos: [] }
    if (historico.wave_height?.[i] != null) grupo.alturas.push(historico.wave_height[i])
    if (historico.wave_period?.[i] != null) grupo.periodos.push(historico.wave_period[i])
    porDia.set(dia, grupo)
  })
  const media = (lista) => (lista.length ? lista.reduce((a, b) => a + b, 0) / lista.length : null)
  return Array.from(porDia.entries())
    .filter(([, g]) => g.alturas.length)
    .map(([dia, g]) => ({
      dia,
      maxima: Math.max(...g.alturas),
      media: Number(media(g.alturas).toFixed(2)),
      periodo: media(g.periodos),
    }))
}

// Reanálise ERA5 (histórico, não previsão): o que o mar fez nos últimos
// ~3 meses no ponto. A API tem uns 5 dias de atraso nesse modelo.
function HistoricoEra5({ historico, unidades }) {
  const dias = useMemo(() => agruparPorDia(historico), [historico])
  if (!dias.length) return null

  const maiorDia = dias.reduce((maior, d) => (d.maxima > maior.maxima ? d : maior))
  const mediaGeral = dias.reduce((soma, d) => soma + d.media, 0) / dias.length
  const periodos = dias.map((d) => d.periodo).filter((p) => p != null)
  const periodoMedio = periodos.length ? periodos.reduce((a, b) => a + b, 0) / periodos.length : null
  const unidade = unidades.wave_height ?? 'm'

  return (
    <div className={styles.bloco}>
      <div className={styles.blocoCabecalho}>
        <h3 className={styles.blocoTitulo}>Histórico dos últimos {dias.length} dias</h3>
        <span className={styles.blocoNota}>
          ERA5 Ocean (reanálise) · {formatarData(dias[0].dia)} a {formatarData(dias.at(-1).dia)}
        </span>
      </div>

      <div className={styles.resumoHistorico}>
        <div>
          <span className={styles.resumoRotulo}>Maior onda</span>
          <span className={styles.resumoValor}>{formatarValor(maiorDia.maxima, unidade, 2)}</span>
          <span className={styles.resumoRotulo}>em {formatarData(maiorDia.dia)}</span>
        </div>
        <div>
          <span className={styles.resumoRotulo}>Altura média</span>
          <span className={styles.resumoValor}>{formatarValor(mediaGeral, unidade, 2)}</span>
        </div>
        <div>
          <span className={styles.resumoRotulo}>Período médio</span>
          <span className={styles.resumoValor}>{formatarValor(periodoMedio, unidades.wave_period ?? 's', 1)}</span>
        </div>
      </div>

      <figure className={styles.figura}>
        <figcaption className={styles.figuraTitulo}>Altura de onda por dia ({unidade})</figcaption>
        <ul className={styles.legenda}>
          <li>
            <span className={styles.legendaTraco} style={{ backgroundColor: 'var(--modelo-1)' }} />
            Máxima do dia
          </li>
          <li>
            <span className={styles.legendaTraco} style={{ backgroundColor: 'var(--modelo-2)' }} />
            Média do dia
          </li>
        </ul>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={dias} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--color-grid)" />
            <XAxis dataKey="dia" tickFormatter={formatarData} minTickGap={36} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} stroke="var(--color-grid)" />
            <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} stroke="var(--color-grid)" />
            <Tooltip content={<TooltipGrafico formatarRotulo={formatarData} unidade={unidade} />} />
            <Line type="monotone" dataKey="maxima" name="Máxima do dia" stroke="var(--modelo-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="media" name="Média do dia" stroke="var(--modelo-2)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </figure>
    </div>
  )
}

export default HistoricoEra5
