import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import TooltipGrafico from './TooltipGrafico'
import { extremosDeMare, formatarDataHora, formatarValor } from '../../services/marinha'
import styles from './PrevisaoMaritima.module.css'

function rotuloEixo(dataHora) {
  return `${dataHora.slice(8, 10)}/${dataHora.slice(5, 7)} ${dataHora.slice(11, 13)}h`
}

// Nível do mar e correntes a cada 15 min (`minutely_15` da API): último dia
// + próximos 3. Dois gráficos separados porque são grandezas diferentes
// (m e km/h) — nunca dois eixos Y no mesmo gráfico.
function MareCorrentes({ quinzeMinutos, unidades }) {
  const { tempo, sea_level_height_msl: niveis, ocean_current_velocity: velocidades, ocean_current_direction: direcoes } =
    quinzeMinutos

  const dados = useMemo(
    () => tempo.map((t, i) => ({ t, nivel: niveis[i], velocidade: velocidades[i], direcao: direcoes[i] })),
    [tempo, niveis, velocidades, direcoes],
  )

  const agora = useMemo(() => {
    const instante = new Date()
    return tempo.find((t) => new Date(t) >= instante)
  }, [tempo])

  const proximasMares = useMemo(() => {
    const instante = new Date()
    return extremosDeMare(tempo, niveis)
      .filter((e) => new Date(e.dataHora) >= instante)
      .slice(0, 6)
  }, [tempo, niveis])

  if (!tempo.length) return null

  const unidadeNivel = unidades.sea_level_height_msl ?? 'm'
  const unidadeCorrente = unidades.ocean_current_velocity ?? 'km/h'

  return (
    <div className={styles.bloco}>
      <div className={styles.blocoCabecalho}>
        <h3 className={styles.blocoTitulo}>Maré e correntes</h3>
        <span className={styles.blocoNota}>A cada 15 min · último dia e próximos 3</span>
      </div>

      <div className={styles.gradeDupla}>
        <figure className={styles.figura}>
          <figcaption className={styles.figuraTitulo}>Nível do mar ({unidadeNivel})</figcaption>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="gradienteNivel" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--mar-nivel)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--mar-nivel)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-grid)" />
              <XAxis dataKey="t" tickFormatter={rotuloEixo} minTickGap={48} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} stroke="var(--color-grid)" />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} stroke="var(--color-grid)" />
              <Tooltip content={<TooltipGrafico formatarRotulo={formatarDataHora} unidade={unidadeNivel} />} />
              {agora && <ReferenceLine x={agora} stroke="var(--color-text-secondary)" strokeDasharray="3 3" label={{ value: 'Agora', fontSize: 11, fill: 'var(--color-text-secondary)', position: 'insideTopRight' }} />}
              <Area type="monotone" dataKey="nivel" name="Nível do mar" stroke="var(--mar-nivel)" strokeWidth={2} fill="url(#gradienteNivel)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </figure>

        <figure className={styles.figura}>
          <figcaption className={styles.figuraTitulo}>Velocidade da corrente ({unidadeCorrente})</figcaption>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid vertical={false} stroke="var(--color-grid)" />
              <XAxis dataKey="t" tickFormatter={rotuloEixo} minTickGap={48} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} stroke="var(--color-grid)" />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} stroke="var(--color-grid)" />
              <Tooltip content={<TooltipGrafico formatarRotulo={formatarDataHora} unidade={unidadeCorrente} />} />
              {agora && <ReferenceLine x={agora} stroke="var(--color-text-secondary)" strokeDasharray="3 3" />}
              <Line type="monotone" dataKey="velocidade" name="Corrente" stroke="var(--mar-corrente)" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </figure>
      </div>

      {proximasMares.length > 0 && (
        <div className={styles.listaMares}>
          <span className={styles.listaMaresTitulo}>Próximas marés</span>
          {proximasMares.map((mare) => (
            <span key={mare.dataHora} className={`${styles.mare} ${mare.tipo === 'alta' ? styles.mareAlta : styles.mareBaixa}`}>
              <strong>{mare.tipo === 'alta' ? 'Preamar' : 'Baixa-mar'}</strong>
              {formatarDataHora(mare.dataHora)} · {formatarValor(mare.nivel, unidadeNivel, 2)}
            </span>
          ))}
        </div>
      )}
      <p className={styles.aviso}>
        Nível do mar = maré + efeito do vento e da pressão, calculado pelo modelo (MeteoFrance). Perto da costa a precisão é
        limitada — não use pra navegação.
      </p>
    </div>
  )
}

export default MareCorrentes
