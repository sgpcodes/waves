import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowDown, ArrowUp, Moon } from 'lucide-react'
import GraficoEnergia from './GraficoEnergia'
import Seta from './Seta'
import TooltipGrafico from './TooltipGrafico'
import { direcaoTexto, formatarDataHora, formatarValor } from '../../services/marinha'
import { mareAgora } from '../../services/marinhaSimples'
import {
  HORA_FIM_DIA,
  HORA_INICIO_DIA,
  LEGENDA_ONDA,
  corDaOnda,
  montarGrade,
  montarHoras,
  resumoPorDia,
} from '../../services/marinhaIntermediaria'
import styles from './VisaoIntermediaria.module.css'

function ChipVento({ tipo }) {
  if (!tipo) return null
  return (
    <span className={styles.chipVento}>
      <span className={styles.chipVentoPonto} style={{ backgroundColor: tipo.cor }} />
      {tipo.rotulo}
    </span>
  )
}

// "0,9–2,5 m"; quando mínimo e máximo arredondam igual, só um valor.
function formatarFaixa(faixa, unidade, casas) {
  if (!faixa) return '—'
  const min = formatarValor(faixa.min, null, casas)
  const max = formatarValor(faixa.max, null, casas)
  return `${min === max ? max : `${min}–${max}`} ${unidade}`
}

// Coluna fora do horário com luz — ganha fundo sombreado e ícone de lua.
function ehNoite(coluna) {
  return coluna.hora < HORA_INICIO_DIA || coluna.hora > HORA_FIM_DIA
}

function rotuloDia(dataHora) {
  return `${dataHora.slice(8, 10)}/${dataHora.slice(5, 7)}`
}

function rotuloHora(dataHora) {
  return `${dataHora.slice(8, 10)}/${dataHora.slice(5, 7)} ${dataHora.slice(11, 13)}h`
}

// Aba "Visão intermediária" — pra quem entende de mar, no estilo dos sites
// de surfe: grade de 3 em 3 horas, gráficos de onda/vento/maré e o resumo
// de cada dia.
function VisaoIntermediaria({ previsao }) {
  const [soDia, setSoDia] = useState(false)
  const horas = useMemo(() => montarHoras(previsao), [previsao])
  const grade = useMemo(() => montarGrade(horas, { dias: 7, soDia }), [horas, soDia])
  const resumo = useMemo(() => resumoPorDia(horas, 10), [horas])
  const mare = mareAgora(previsao.quinzeMinutos)

  // Gráficos: 7 dias de 3 em 3 h (ondas e vento) e 3 dias hora a hora (maré).
  const dadosGrafico = useMemo(() => {
    const agora = new Date()
    agora.setMinutes(0, 0, 0)
    const fim = new Date(agora)
    fim.setDate(fim.getDate() + 7)
    return horas.filter((h) => new Date(h.t) >= agora && new Date(h.t) < fim && h.hora % 3 === 0)
  }, [horas])
  const dadosMare = useMemo(() => {
    const agora = new Date()
    agora.setMinutes(0, 0, 0)
    const fim = new Date(agora)
    fim.setDate(fim.getDate() + 3)
    return horas.filter((h) => new Date(h.t) >= agora && new Date(h.t) < fim && h.mare != null)
  }, [horas])
  const ticksDiarios = useMemo(() => dadosGrafico.filter((h) => h.hora === 0).map((h) => h.t), [dadosGrafico])

  const agora = useMemo(() => {
    const instante = new Date()
    instante.setMinutes(0, 0, 0)
    return horas.find((h) => new Date(h.t) >= instante) ?? horas[0]
  }, [horas])

  if (!agora) return <p className={styles.vazio}>Sem dados de ondas pra este ponto agora.</p>

  const unidadeVento = previsao.vento?.unidade ?? 'km/h'
  const semOrientacao = previsao.ponto.orientacao == null

  return (
    <div className={styles.visao}>
      {/* Agora */}
      <div className={styles.agora}>
        <div className={styles.agoraItem}>
          <span className={styles.agoraRotulo}>Ondulação</span>
          <span className={styles.agoraValor}>
            <Seta variavel="wave_direction" graus={agora.swellDirecao ?? agora.direcao} tamanho={18} />
            {formatarValor(agora.altura, 'm', 1)}
          </span>
          <span className={styles.agoraDetalhe}>
            {formatarValor(agora.swellPeriodo ?? agora.periodo, 's', 0)} · de {direcaoTexto(agora.swellDirecao ?? agora.direcao)} ·{' '}
            {formatarValor(agora.energia, 'J/m²', 0)}
          </span>
        </div>
        <div className={styles.agoraItem}>
          <span className={styles.agoraRotulo}>Vento</span>
          <span className={styles.agoraValor}>
            <Seta variavel="wind_direction" graus={agora.ventoDirecao} tamanho={18} />
            {agora.vento != null ? formatarValor(agora.vento, unidadeVento, 0) : 'Sem dado'}
          </span>
          <span className={styles.agoraDetalhe}>
            de {direcaoTexto(agora.ventoDirecao)} · rajada {formatarValor(agora.rajada, null, 0)} <ChipVento tipo={agora.tipoVento} />
          </span>
        </div>
        <div className={styles.agoraItem}>
          <span className={styles.agoraRotulo}>Maré</span>
          <span className={styles.agoraValor}>
            {mare ? mare.subindo ? <ArrowUp size={18} /> : <ArrowDown size={18} /> : null}
            {mare ? (mare.subindo ? 'Enchendo' : 'Vazando') : '—'}
          </span>
          <span className={styles.agoraDetalhe}>
            {mare?.proximas[0]
              ? `${mare.proximas[0].tipo === 'alta' ? 'Preamar' : 'Baixa-mar'} ${formatarDataHora(mare.proximas[0].dataHora).slice(6)} · ${formatarValor(mare.proximas[0].nivel, 'm', 2)}`
              : '—'}
          </span>
        </div>
        <div className={styles.agoraItem}>
          <span className={styles.agoraRotulo}>Água</span>
          <span className={styles.agoraValor}>{formatarValor(previsao.atual.sea_surface_temperature, '°C', 1)}</span>
          <span className={styles.agoraDetalhe}>temperatura da superfície</span>
        </div>
      </div>

      {/* Grade de 3 em 3 horas */}
      <div className={styles.bloco}>
        <div className={styles.blocoCabecalho}>
          <h3 className={styles.blocoTitulo}>Previsão de 3 em 3 horas</h3>
          <div className={styles.alternar} role="group" aria-label="Horário">
            <button type="button" className={`${styles.alternarBotao} ${!soDia ? styles.alternarAtivo : ''}`} onClick={() => setSoDia(false)}>
              Dia todo (24h)
            </button>
            <button type="button" className={`${styles.alternarBotao} ${soDia ? styles.alternarAtivo : ''}`} onClick={() => setSoDia(true)}>
              Só com luz ({HORA_INICIO_DIA}h–{HORA_FIM_DIA}h)
            </button>
          </div>
        </div>

        <div className={styles.gradeRolagem}>
          <table className={styles.grade}>
            <thead>
              <tr>
                <th className={styles.gradeRotulo} scope="col" />
                {grade.map((dia) => (
                  <th key={dia.data} colSpan={dia.colunas.length} className={styles.gradeDia} scope="colgroup">
                    {dia.rotulo}
                  </th>
                ))}
              </tr>
              <tr>
                <th className={styles.gradeRotulo} scope="row">Hora</th>
                {grade.flatMap((dia) =>
                  dia.colunas.map((c, i) => (
                    <th key={c.t} className={`${styles.gradeHora} ${i === 0 ? styles.inicioDia : ''} ${ehNoite(c) ? styles.colunaNoite : ''}`} scope="col">
                      <span className={styles.horaComIcone}>
                        {ehNoite(c) && <Moon size={10} aria-label="noite" />}
                        {String(c.hora).padStart(2, '0')}h
                      </span>
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              <LinhaGrade
                rotulo="Ondas (m)"
                grade={grade}
                destaque
                estilo={(c) => {
                  const cor = corDaOnda(c.altura)
                  return cor ? { backgroundColor: cor.fundo, color: cor.textoClaro ? '#fff' : '#0d2a4d' } : undefined
                }}
                celula={(c) => formatarValor(c.altura, null, 1)}
              />
              <LinhaGrade rotulo="Período (s)" grade={grade} celula={(c) => formatarValor(c.swellPeriodo ?? c.periodo, null, 0)} />
              <LinhaGrade rotulo="Energia (J/m²)" grade={grade} celula={(c) => formatarValor(c.energia, null, 0)} />
              <LinhaGrade rotulo="Potência (kW/m)" grade={grade} pequena celula={(c) => formatarValor(c.potencia, null, 1)} />
              <LinhaGrade
                rotulo="Direção"
                grade={grade}
                celula={(c) => (
                  <span className={styles.celulaDirecao}>
                    <Seta variavel="wave_direction" graus={c.swellDirecao ?? c.direcao} tamanho={13} />
                    {direcaoTexto(c.swellDirecao ?? c.direcao)}
                  </span>
                )}
              />
              <LinhaGrade
                rotulo="Swell 2"
                grade={grade}
                pequena
                celula={(c) =>
                  c.swell2Altura != null ? `${formatarValor(c.swell2Altura, null, 1)} · ${formatarValor(c.swell2Periodo, null, 0)}s ${direcaoTexto(c.swell2Direcao)}` : '—'
                }
              />
              <LinhaGrade rotulo={`Vento (${unidadeVento})`} grade={grade} destaque celula={(c) => formatarValor(c.vento, null, 0)} />
              <LinhaGrade rotulo="Rajada" grade={grade} pequena celula={(c) => formatarValor(c.rajada, null, 0)} />
              <LinhaGrade
                rotulo="Dir. vento"
                grade={grade}
                celula={(c) => (
                  <span className={styles.celulaDirecao}>
                    <Seta variavel="wind_direction" graus={c.ventoDirecao} tamanho={13} />
                    {direcaoTexto(c.ventoDirecao)}
                  </span>
                )}
              />
              <LinhaGrade
                rotulo="Tipo"
                grade={grade}
                pequena
                celula={(c) =>
                  c.tipoVento ? (
                    <span className={styles.celulaTipo}>
                      <span className={styles.chipVentoPonto} style={{ backgroundColor: c.tipoVento.cor }} />
                      {c.tipoVento.rotulo}
                    </span>
                  ) : (
                    '—'
                  )
                }
              />
              <LinhaGrade rotulo="Maré (m)" grade={grade} pequena celula={(c) => formatarValor(c.mare, null, 2)} />
            </tbody>
          </table>
        </div>

        <div className={styles.legendas}>
          <span className={styles.legendaTitulo}>Ondas:</span>
          {LEGENDA_ONDA.map((faixa) => (
            <span key={faixa.rotulo} className={styles.legendaItem}>
              <span className={styles.legendaCor} style={{ backgroundColor: faixa.fundo }} />
              {faixa.rotulo}
            </span>
          ))}
          <span className={styles.legendaTitulo}>Vento:</span>
          <span className={styles.legendaItem}>
            <span className={styles.chipVentoPonto} style={{ backgroundColor: 'var(--status-bom)' }} /> Terral ou fraco (bom)
          </span>
          <span className={styles.legendaItem}>
            <span className={styles.chipVentoPonto} style={{ backgroundColor: 'var(--status-atencao)' }} /> Lateral
          </span>
          <span className={styles.legendaItem}>
            <span className={styles.chipVentoPonto} style={{ backgroundColor: 'var(--status-serio)' }} /> Maral (ruim)
          </span>
        </div>
        {semOrientacao && <p className={styles.nota}>Este ponto não tem a orientação da praia cadastrada, então não dá pra dizer se o vento é terral ou maral.</p>}
      </div>

      {/* Gráfico de ondas */}
      <div className={styles.bloco}>
        <div className={styles.blocoCabecalho}>
          <h3 className={styles.blocoTitulo}>Ondas — próximos 7 dias</h3>
          <span className={styles.blocoNota}>De 3 em 3 horas</span>
        </div>
        <ul className={styles.legendaGrafico}>
          <li>
            <span className={styles.legendaBarra} style={{ backgroundColor: 'var(--modelo-1)' }} /> Altura total
          </li>
          <li>
            <span className={styles.legendaTraco} style={{ backgroundColor: 'var(--modelo-2)' }} /> Swell primário
          </li>
        </ul>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={dadosGrafico} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barCategoryGap={1}>
            <CartesianGrid vertical={false} stroke="var(--color-grid)" />
            <XAxis dataKey="t" ticks={ticksDiarios} tickFormatter={rotuloDia} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} stroke="var(--color-grid)" />
            <YAxis unit=" m" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} stroke="var(--color-grid)" />
            <Tooltip content={<TooltipGrafico formatarRotulo={rotuloHora} unidade="m" casas={1} />} cursor={{ fill: 'var(--color-table-linha-hover)' }} />
            <Bar dataKey="altura" name="Altura total" fill="var(--modelo-1)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Line type="monotone" dataKey="swellAltura" name="Swell primário" stroke="var(--modelo-2)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de energia */}
      <div className={styles.bloco}>
        <div className={styles.blocoCabecalho}>
          <h3 className={styles.blocoTitulo}>Energia das ondas — próximos 7 dias</h3>
          <span className={styles.blocoNota}>De 3 em 3 horas</span>
        </div>
        <GraficoEnergia horaria={previsao.horaria} dias={7} />
      </div>

      <div className={styles.duasColunas}>
        {/* Gráfico de vento */}
        <div className={styles.bloco}>
          <div className={styles.blocoCabecalho}>
            <h3 className={styles.blocoTitulo}>Vento — próximos 7 dias</h3>
            <span className={styles.blocoNota}>{unidadeVento}</span>
          </div>
          <ul className={styles.legendaGrafico}>
            <li>
              <span className={styles.legendaTraco} style={{ backgroundColor: 'var(--modelo-3)' }} /> Vento médio
            </li>
            <li>
              <span className={styles.legendaTraco} style={{ backgroundColor: 'var(--modelo-4)' }} /> Rajada
            </li>
          </ul>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dadosGrafico} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid vertical={false} stroke="var(--color-grid)" />
              <XAxis dataKey="t" ticks={ticksDiarios} tickFormatter={rotuloDia} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} stroke="var(--color-grid)" />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} stroke="var(--color-grid)" />
              <Tooltip content={<TooltipGrafico formatarRotulo={rotuloHora} unidade={unidadeVento} casas={0} />} />
              <Line type="monotone" dataKey="vento" name="Vento médio" stroke="var(--modelo-3)" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="rajada" name="Rajada" stroke="var(--modelo-4)" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de maré */}
        <div className={styles.bloco}>
          <div className={styles.blocoCabecalho}>
            <h3 className={styles.blocoTitulo}>Maré — próximos 3 dias</h3>
            <span className={styles.blocoNota}>nível do mar (m)</span>
          </div>
          <ResponsiveContainer width="100%" height={244}>
            <AreaChart data={dadosMare} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="gradienteMareIntermediaria" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--mar-nivel)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--mar-nivel)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-grid)" />
              <XAxis dataKey="t" tickFormatter={rotuloHora} minTickGap={50} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} stroke="var(--color-grid)" />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} stroke="var(--color-grid)" />
              <ReferenceLine y={0} stroke="var(--color-text-secondary)" strokeDasharray="3 3" />
              <Tooltip content={<TooltipGrafico formatarRotulo={rotuloHora} unidade="m" casas={2} />} />
              <Area type="monotone" dataKey="mare" name="Maré" stroke="var(--mar-nivel)" strokeWidth={2} fill="url(#gradienteMareIntermediaria)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Resumo por dia */}
      <div className={styles.bloco}>
        <div className={styles.blocoCabecalho}>
          <h3 className={styles.blocoTitulo}>Resumo dos próximos {resumo.length} dias</h3>
          <span className={styles.blocoNota}>
            Todas as colunas: das {HORA_INICIO_DIA}h às {HORA_FIM_DIA}h (horário com luz)
          </span>
        </div>
        <div className={styles.gradeRolagem}>
          <table className={styles.resumo}>
            <thead>
              <tr>
                <th scope="col">Dia</th>
                <th scope="col">Ondas</th>
                <th scope="col">Período</th>
                <th scope="col">Ondulação vem de</th>
                <th scope="col">Vento</th>
              </tr>
            </thead>
            <tbody>
              {resumo.map((dia) => (
                <tr key={dia.data}>
                  <th scope="row">{dia.rotulo}</th>
                  <td>
                    <strong>{formatarFaixa(dia.onda, 'm', 1)}</strong>
                  </td>
                  <td>{formatarFaixa(dia.periodo, 's', 0)}</td>
                  <td>
                    <span className={styles.celulaDirecao}>
                      <Seta variavel="wave_direction" graus={dia.direcao} tamanho={13} />
                      {direcaoTexto(dia.direcao)}
                    </span>
                  </td>
                  <td>
                    {dia.vento ? (
                      <span className={styles.celulaDirecao}>
                        {formatarFaixa(dia.vento, unidadeVento, 0)} · de {direcaoTexto(dia.ventoDirecao)}
                        <ChipVento tipo={dia.ventoTipo} />
                      </span>
                    ) : (
                      <span className={styles.semNota}>sem dado de vento</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Uma linha da grade: rótulo fixo à esquerda + uma célula por coluna.
function LinhaGrade({ rotulo, grade, celula, estilo, destaque = false, pequena = false }) {
  return (
    <tr className={`${destaque ? styles.linhaDestaque : ''} ${pequena ? styles.linhaPequena : ''}`}>
      <th className={styles.gradeRotulo} scope="row">
        {rotulo}
      </th>
      {grade.flatMap((dia) =>
        dia.colunas.map((c, i) => (
          <td key={c.t} className={`${i === 0 ? styles.inicioDia : ''} ${ehNoite(c) ? styles.colunaNoite : ''}`} style={estilo?.(c)}>
            {celula(c)}
          </td>
        )),
      )}
    </tr>
  )
}

export default VisaoIntermediaria
