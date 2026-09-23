import { useMemo, useState } from 'react'
import { Droplets, Sunrise, Sunset, Eye, Gauge, Wind, ChevronDown } from 'lucide-react'
import iconeSol from '../assets/clima/sol.png'
import iconeNublado from '../assets/clima/nublado.png'
import iconeParcialmenteNublado from '../assets/clima/parcialmente-nublado.png'
import iconeChuva from '../assets/clima/chuva.png'
import iconeNoite from '../assets/clima/noite.png'
import { TEXTOS } from '../services/textos'
import styles from './PrevisaoSemana.module.css'

// Não existe ícone de tempestade separado no material, então tempestade
// reaproveita o de chuva (a condição já vem pronta do backend).
const IMAGEM_CONDICAO = {
  sol: iconeSol,
  nublado: iconeNublado,
  'parcialmente-nublado': iconeParcialmenteNublado,
  chuva: iconeChuva,
  tempestade: iconeChuva,
  noite: iconeNoite,
}

function formatarDataCurta(dataISO) {
  return dataISO ? `${dataISO.slice(8, 10)}/${dataISO.slice(5, 7)}` : '—'
}

function formatarHora(horaISO) {
  if (!horaISO) return '—'
  return new Date(horaISO).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// Sol à noite não faz sentido — troca pela lua fora do horário aproximado
// de dia (06h-18h). Só quando `dataHoraISO` tem hora ("AAAA-MM-DDTHH:mm");
// os cards de dia passam só a data, sem hora pra checar.
function iconeParaHora(condicao, dataHoraISO) {
  if (condicao === 'sol' && dataHoraISO?.length > 10) {
    const hora = Number(dataHoraISO.slice(11, 13))
    if (hora < 6 || hora >= 18) return IMAGEM_CONDICAO.noite
  }
  return IMAGEM_CONDICAO[condicao] ?? IMAGEM_CONDICAO.sol
}

const HORAS_A_FRENTE_HOJE = 24

const TURNOS = [
  { chave: 'manha', rotulo: TEXTOS.turnoManha, ehDoTurno: (hora) => hora >= 6 && hora < 12 },
  { chave: 'tarde', rotulo: TEXTOS.turnoTarde, ehDoTurno: (hora) => hora >= 12 && hora < 18 },
  { chave: 'noite', rotulo: TEXTOS.turnoNoite, ehDoTurno: (hora) => hora >= 18 || hora < 6 },
]

// Prioriza a condição mais severa do turno em vez da "moda": se teve 1h de
// chuva e 5h de sol, o que importa pra quem consulta é que vai chover.
const PRIORIDADE_CONDICAO = { tempestade: 4, chuva: 3, nublado: 2, 'parcialmente-nublado': 1, sol: 0 }

function condicaoMaisSevera(lista) {
  return lista.reduce((pior, atual) => (PRIORIDADE_CONDICAO[atual] > PRIORIDADE_CONDICAO[pior] ? atual : pior), 'sol')
}

function media(numeros) {
  const validos = numeros.filter((n) => n != null)
  return validos.length ? Math.round(validos.reduce((soma, n) => soma + n, 0) / validos.length) : null
}

// Agrupa a previsão hora a hora de um dia em manhã/tarde/noite — turno sem
// nenhuma hora (ex.: manhã de hoje já passou) não entra na lista.
function agruparPorTurno(pontosDoDia) {
  return TURNOS.map((turno) => {
    const pontos = pontosDoDia.filter((p) => turno.ehDoTurno(Number(p.dataHora.slice(11, 13))))
    if (pontos.length === 0) return null
    const condicao = condicaoMaisSevera(pontos.map((p) => p.condicao))
    return {
      chave: turno.chave,
      rotulo: turno.rotulo,
      temperatura: media(pontos.map((p) => p.temperatura)),
      chuvaProbabilidade: pontos.some((p) => p.chuvaProbabilidade != null)
        ? Math.max(...pontos.map((p) => p.chuvaProbabilidade ?? 0))
        : null,
      icone: turno.chave === 'noite' && condicao === 'sol' ? IMAGEM_CONDICAO.noite : (IMAGEM_CONDICAO[condicao] ?? IMAGEM_CONDICAO.sol),
    }
  }).filter(Boolean)
}

// Previsão de 15 dias + painel "Hoje" (ponto de orvalho, UV, visibilidade,
// nascer/pôr do sol). Clicar num dia expande a previsão por turno embaixo.
function PrevisaoSemana({ clima, cidade }) {
  const [diaExpandidoIndice, setDiaExpandidoIndice] = useState(null)

  const dias = clima?.previsaoDiaria ?? []
  const diaHoje = dias[0] ?? null
  const iconeHoje = diaHoje ? iconeParaHora(diaHoje.condicao, clima?.atualizadoEm) : IMAGEM_CONDICAO.sol

  const diaExpandido = diaExpandidoIndice != null ? dias[diaExpandidoIndice] : null
  const turnosDoDiaExpandido = useMemo(() => {
    if (!diaExpandido) return []
    const agora = new Date()
    const horasDoDia = (clima?.previsaoHoraria ?? []).filter(
      (ponto) => ponto.data === diaExpandido.data && new Date(ponto.dataHora) >= agora,
    )
    return agruparPorTurno(horasDoDia)
  }, [clima, diaExpandido])

  // Hora a hora do dia clicado. Em "Hoje", são as próximas 24h a partir da
  // hora atual (entra na madrugada de amanhã, senão à noite sobraria quase
  // nada); nos outros dias, as 24h do próprio dia.
  const horasDoDiaExpandido = useMemo(() => {
    if (!diaExpandido) return []
    const horaria = clima?.previsaoHoraria ?? []
    if (diaExpandidoIndice === 0) {
      const inicioHoraAtual = new Date()
      inicioHoraAtual.setMinutes(0, 0, 0)
      return horaria.filter((ponto) => new Date(ponto.dataHora) >= inicioHoraAtual).slice(0, HORAS_A_FRENTE_HOJE)
    }
    return horaria.filter((ponto) => ponto.data === diaExpandido.data)
  }, [clima, diaExpandido, diaExpandidoIndice])

  function aoClicarDia(indice) {
    setDiaExpandidoIndice((atual) => (atual === indice ? null : indice))
  }

  function nomeDoDia(indice, dia) {
    return indice === 0 ? TEXTOS.hoje : dia.diaSemana
  }

  return (
    <div className={styles.container}>
      <div className={styles.blocoSemana}>
        <div className={styles.cabecalhoPrevisao}>
          <span className={styles.iconeCabecalho}>
            <img src={iconeHoje} alt="" className={styles.imagemIconeGrande} />
          </span>
          <div>
            <h2 className={styles.titulo}>
              {TEXTOS.previsaoTitulo}
              {cidade && ` — ${cidade}`}
            </h2>
            <p className={styles.subtitulo}>{TEXTOS.previsaoSubtitulo}</p>
          </div>
        </div>

        {dias.length === 0 ? (
          <p className={styles.vazio}>{TEXTOS.previsaoIndisponivel}</p>
        ) : (
          <div className={styles.diasSemana}>
            {dias.map((dia, indice) => (
              <button
                key={dia.data}
                type="button"
                className={`${styles.diaCard} ${diaExpandidoIndice === indice ? styles.diaCardAtivo : ''}`}
                onClick={() => aoClicarDia(indice)}
                aria-expanded={diaExpandidoIndice === indice}
              >
                <span className={styles.diaCardNome}>{nomeDoDia(indice, dia)}</span>
                <span className={styles.diaCardData}>{formatarDataCurta(dia.data)}</span>
                <img src={iconeParaHora(dia.condicao, dia.data)} alt={dia.condicaoTexto} className={styles.diaCardIcone} />
                <span className={styles.diaCardTemp}>
                  {Math.round(dia.tempMin)}° / {Math.round(dia.tempMax)}°
                </span>
                <span className={styles.diaCardResumo}>{dia.condicaoTexto}</span>
                <span className={styles.diaCardMetrica}>
                  <Droplets size={12} /> {dia.chuvaProbabilidade != null ? `${dia.chuvaProbabilidade}%` : '—'}
                </span>
                <span className={styles.diaCardMetrica}>
                  <Wind size={12} /> {dia.ventoDirecaoTexto} {dia.ventoIntensidade}
                </span>
                <ChevronDown size={14} className={`${styles.diaCardSeta} ${diaExpandidoIndice === indice ? styles.diaCardSetaAberta : ''}`} />
              </button>
            ))}
          </div>
        )}

        {diaExpandido && (
          <div className={styles.painelHoras}>
            <h3 className={styles.painelHorasTitulo}>
              {TEXTOS.previsaoPorPeriodo} — {nomeDoDia(diaExpandidoIndice, diaExpandido)}, {formatarDataCurta(diaExpandido.data)}
            </h3>
            {turnosDoDiaExpandido.length === 0 && horasDoDiaExpandido.length === 0 && (
              <p className={styles.vazio}>{TEXTOS.previsaoIndisponivel}</p>
            )}
            {turnosDoDiaExpandido.length > 0 && (
              <div className={styles.turnos}>
                {turnosDoDiaExpandido.map((turno) => (
                  <div key={turno.chave} className={styles.turnoCard}>
                    <span className={styles.turnoRotulo}>{turno.rotulo}</span>
                    <img src={turno.icone} alt="" className={styles.turnoIcone} />
                    <span className={styles.turnoTemp}>{turno.temperatura != null ? `${turno.temperatura}°` : '—'}</span>
                    <span className={styles.turnoChuva}>
                      <Droplets size={12} /> {turno.chuvaProbabilidade != null ? `${turno.chuvaProbabilidade}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {horasDoDiaExpandido.length > 0 && (
              <>
                <h4 className={styles.horasTitulo}>
                  {diaExpandidoIndice === 0 ? TEXTOS.proximasHoras : TEXTOS.horaAHora}
                </h4>
                <div className={styles.horas}>
                  {horasDoDiaExpandido.map((ponto, indice) => (
                    <div key={ponto.dataHora} className={`${styles.horaCard} ${diaExpandidoIndice === 0 && indice === 0 ? styles.horaCardAgora : ''}`}>
                      <span className={styles.horaRotulo}>
                        {diaExpandidoIndice === 0 && indice === 0 ? TEXTOS.agora : `${ponto.dataHora.slice(11, 13)}h`}
                      </span>
                      <img src={iconeParaHora(ponto.condicao, ponto.dataHora)} alt="" className={styles.horaIcone} />
                      <span className={styles.horaTemp}>{ponto.temperatura != null ? `${Math.round(ponto.temperatura)}°` : '—'}</span>
                      <span className={styles.turnoChuva}>
                        <Droplets size={11} /> {ponto.chuvaProbabilidade != null ? `${ponto.chuvaProbabilidade}%` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className={styles.painelHoje}>
        <h3 className={styles.painelTitulo}>{TEXTOS.hoje}</h3>
        <ul className={styles.listaDetalhes}>
          <li>
            <span className={styles.rotuloDetalhe}>
              <Gauge size={14} /> {TEXTOS.temperatura}
            </span>
            <span className={styles.valorDetalhe}>{diaHoje ? `${Math.round(diaHoje.tempMin)}° / ${Math.round(diaHoje.tempMax)}°C` : '—'}</span>
          </li>
          <li>
            <span className={styles.rotuloDetalhe}>
              <Droplets size={14} /> {TEXTOS.pontoOrvalho}
            </span>
            <span className={styles.valorDetalhe}>{clima?.pontoDeOrvalho != null ? `${clima.pontoDeOrvalho}°C` : '—'}</span>
          </li>
          <li>
            <span className={styles.rotuloDetalhe}>
              <Gauge size={14} /> {TEXTOS.indiceUV}
            </span>
            <span className={styles.valorDetalhe}>{clima?.indiceUV ?? '—'}</span>
          </li>
          <li>
            <span className={styles.rotuloDetalhe}>
              <Droplets size={14} /> {TEXTOS.precipitacao24h}
            </span>
            <span className={styles.valorDetalhe}>{clima?.precipitacao != null ? `${clima.precipitacao} mm` : '—'}</span>
          </li>
          <li>
            <span className={styles.rotuloDetalhe}>
              <Eye size={14} /> {TEXTOS.visibilidade}
            </span>
            <span className={styles.valorDetalhe}>{clima?.visibilidadeKm != null ? `${clima.visibilidadeKm} km` : '—'}</span>
          </li>
        </ul>

        <div className={styles.blocoSol}>
          <div className={styles.itemSol}>
            <Sunrise size={16} />
            <div>
              <span className={styles.rotuloSol}>{TEXTOS.nascerSol}</span>
              <span className={styles.valorSol}>{formatarHora(clima?.nascerSol)}</span>
            </div>
          </div>
          <div className={styles.itemSol}>
            <Sunset size={16} />
            <div>
              <span className={styles.rotuloSol}>{TEXTOS.porSol}</span>
              <span className={styles.valorSol}>{formatarHora(clima?.porSol)}</span>
            </div>
          </div>
        </div>

        <div className={styles.condicaoAtual}>
          <img src={iconeHoje} alt="" className={styles.imagemIconePequena} />
          <div>
            <span className={styles.rotuloSol}>{TEXTOS.condicaoAtual}</span>
            <span className={styles.valorSol}>{clima?.condicaoTexto ?? '—'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrevisaoSemana
