import { useMemo } from 'react'
import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  CircleCheck,
  CircleX,
  Compass,
  LifeBuoy,
  Navigation,
  OctagonAlert,
  Sailboat,
  ShieldCheck,
  Star,
  Thermometer,
  TriangleAlert,
  Waves,
} from 'lucide-react'
import {
  NIVEIS_MAR,
  PROFUNDIDADE_REFERENCIA,
  atividades,
  direcaoPorExtenso,
  forcaCorrente,
  fraseNoCorpo,
  mareAgora,
  nivelDoMar,
  sensacaoAgua,
  tamanhoNoCorpo,
  turnosProximos,
} from '../../services/marinhaSimples'
import { formatarValor } from '../../services/marinha'
import styles from './VisaoSimples.module.css'

const ICONE_NIVEL = { calmo: ShieldCheck, moderado: CircleAlert, agitado: TriangleAlert, perigoso: OctagonAlert }

const ATIVIDADE_NIVEL = {
  bom: { rotulo: 'Bom', icone: CircleCheck, cor: 'var(--status-bom)' },
  atencao: { rotulo: 'Com cuidado', icone: CircleAlert, cor: 'var(--status-atencao)' },
  ruim: { rotulo: 'Não recomendado', icone: CircleX, cor: 'var(--status-critico)' },
}

const ICONE_ATIVIDADE = { banho: Waves, surfe: Waves, standup: Compass, barco: Sailboat }

const DIAS_SEMANA_EXTENSO = {
  Seg: 'Segunda', Ter: 'Terça', Qua: 'Quarta', Qui: 'Quinta', Sex: 'Sexta', Sáb: 'Sábado', Dom: 'Domingo',
}

function horaCurta(dataHora) {
  return dataHora ? `${dataHora.slice(11, 13)}h${dataHora.slice(14, 16) === '00' ? '' : dataHora.slice(14, 16)}` : '—'
}

function nomeDoDia(dataISO, diaSemana) {
  const hoje = new Date()
  const amanha = new Date(hoje)
  amanha.setDate(hoje.getDate() + 1)
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (dataISO === iso(hoje)) return 'Hoje'
  if (dataISO === iso(amanha)) return 'Amanhã'
  return DIAS_SEMANA_EXTENSO[diaSemana] ?? diaSemana
}

function SeloNivel({ nivel, pequeno = false }) {
  if (!nivel) return null
  const Icone = ICONE_NIVEL[nivel.id]
  return (
    <span className={`${styles.selo} ${pequeno ? styles.seloPequeno : ''}`}>
      <Icone size={pequeno ? 14 : 16} style={{ color: nivel.cor }} aria-hidden="true" />
      {nivel.titulo}
    </span>
  )
}

// Ilustração: uma pessoa de 1,70 m com água no joelho e a onda subindo a
// partir da superfície da água — a altura da onda conta da água pra cima,
// não da areia.
function OndaNaPessoa({ altura }) {
  const h = altura ?? 0
  const escalaMaxima = Math.max(2.2, (PROFUNDIDADE_REFERENCIA + h) * 1.12)
  const px = (metros) => (metros / escalaMaxima) * 100
  const chao = 110
  const alturaPessoa = px(1.7)
  const topoPessoa = chao - alturaPessoa
  const nivelAgua = chao - px(PROFUNDIDADE_REFERENCIA)
  const crista = chao - px(PROFUNDIDADE_REFERENCIA + h)
  const cabeca = alturaPessoa * 0.13
  // Recorta o espaço vazio de cima.
  const inicio = Math.max(0, Math.min(topoPessoa, crista) - 10)

  return (
    <svg
      viewBox={`0 ${inicio} 190 ${118 - inicio}`}
      className={styles.ilustracao}
      role="img"
      aria-label={`Onda de ${formatarValor(altura, 'm', 1)} acima da água, comparada com uma pessoa de 1,70 m com água no joelho`}
    >
      {/* pessoa */}
      <g fill="var(--color-text)" opacity="0.85">
        <circle cx="62" cy={topoPessoa + cabeca} r={cabeca} />
        <rect x={62 - cabeca * 0.95} y={topoPessoa + cabeca * 2.15} width={cabeca * 1.9} height={alturaPessoa * 0.4} rx={cabeca * 0.6} />
        <rect x={62 - cabeca * 0.85} y={topoPessoa + cabeca * 2.15 + alturaPessoa * 0.36} width={cabeca * 0.75} height={alturaPessoa * 0.36} rx={cabeca * 0.35} />
        <rect x={62 + cabeca * 0.1} y={topoPessoa + cabeca * 2.15 + alturaPessoa * 0.36} width={cabeca * 0.75} height={alturaPessoa * 0.36} rx={cabeca * 0.35} />
      </g>
      {/* água parada (até o joelho) + a onda subindo a partir dela */}
      <path
        d={`M0 ${nivelAgua} C 25 ${nivelAgua}, 40 ${crista}, 72 ${crista} C 100 ${crista}, 112 ${nivelAgua}, 140 ${nivelAgua} H 150 V 118 H 0 Z`}
        fill="var(--mar-nivel)"
        opacity="0.4"
      />
      <line x1="0" x2="150" y1={chao} y2={chao} stroke="var(--color-text-secondary)" strokeWidth="1" />
      {/* régua: da superfície da água até a crista */}
      <line x1="72" x2="150" y1={crista} y2={crista} stroke="var(--color-text-secondary)" strokeWidth="0.8" strokeDasharray="2 2" />
      <line x1="140" x2="150" y1={nivelAgua} y2={nivelAgua} stroke="var(--color-text-secondary)" strokeWidth="0.8" strokeDasharray="2 2" />
      <line x1="146" x2="146" y1={crista} y2={nivelAgua} stroke="var(--color-text)" strokeWidth="1.5" />
      <line x1="142" x2="150" y1={crista} y2={crista} stroke="var(--color-text)" strokeWidth="1.5" />
      <line x1="142" x2="150" y1={nivelAgua} y2={nivelAgua} stroke="var(--color-text)" strokeWidth="1.5" />
      <text x="153" y={(crista + nivelAgua) / 2 + 3} fontSize="10" fontWeight="700" fill="var(--color-text)">
        {formatarValor(altura, 'm', 1)}
      </text>
      <text x="62" y="117" fontSize="7" textAnchor="middle" fill="var(--color-text-secondary)">
        1,70 m
      </text>
    </svg>
  )
}

// Aba "Visão simples": a mesma previsão da aba técnica, traduzida pra quem
// não entende de mar — como está agora, dá pra fazer o quê, e os próximos dias.
function VisaoSimples({ previsao }) {
  const { atual, diaria, horaria, quinzeMinutos, ponto } = previsao

  const condicaoAgora = {
    altura: atual.wave_height,
    periodo: atual.wave_period,
    corrente: atual.ocean_current_velocity,
  }
  const nivelAgora = nivelDoMar(condicaoAgora)
  const listaAtividades = atividades(condicaoAgora)
  const mare = mareAgora(quinzeMinutos)
  const turnos = useMemo(() => turnosProximos(horaria, 4), [horaria])

  const semana = useMemo(() => {
    const dias = diaria.slice(0, 7).map((dia) => ({
      ...dia,
      nivel: nivelDoMar({ altura: dia.wave_height_max, periodo: dia.wave_period_max }),
    }))
    const comAltura = dias.filter((d) => d.wave_height_max != null)
    const maisCalmo = comAltura.length
      ? comAltura.reduce((melhor, d) => (d.wave_height_max < melhor.wave_height_max ? d : melhor))
      : null
    return { dias, maisCalmo: maisCalmo?.data }
  }, [diaria])

  const agua = sensacaoAgua(atual.sea_surface_temperature)
  const corrente = forcaCorrente(atual.ocean_current_velocity)
  const origemOnda = direcaoPorExtenso(atual.wave_direction)

  if (!nivelAgora) {
    return <p className={styles.vazio}>Sem dados de ondas pra este ponto agora.</p>
  }

  const IconeNivel = ICONE_NIVEL[nivelAgora.id]

  return (
    <div className={styles.visao}>
      {/* Como está agora */}
      <div className={styles.destaque} style={{ '--cor-nivel': nivelAgora.cor }}>
        <div className={styles.destaqueTexto}>
          <span className={styles.destaqueLocal}>Como está o mar agora em {ponto.nome}</span>
          <span className={styles.destaqueTitulo}>
            <IconeNivel size={30} style={{ color: nivelAgora.cor }} aria-hidden="true" />
            {nivelAgora.titulo}
          </span>
          <p className={styles.destaqueFrase}>{nivelAgora.frase}</p>
          <p className={styles.destaqueDetalhe}>
            As ondas sobem cerca de <strong>{formatarValor(atual.wave_height, 'm', 1)}</strong> acima da superfície da água —{' '}
            <strong>{fraseNoCorpo(atual.wave_height)}</strong>
            {origemOnda && (
              <>
                {' '}
                e vêm do <strong>{origemOnda}</strong>
              </>
            )}
            {atual.wave_period != null && (
              <>
                , uma a cada <strong>{Math.round(atual.wave_period)} segundos</strong>
              </>
            )}
            .
          </p>
        </div>
        <OndaNaPessoa altura={atual.wave_height} />
      </div>

      {/* Fatos rápidos */}
      <div className={styles.fatos}>
        <div className={styles.fato}>
          <Thermometer size={20} className={styles.fatoIcone} />
          <span className={styles.fatoRotulo}>Água</span>
          <span className={styles.fatoValor}>{agua ?? '—'}</span>
          <span className={styles.fatoDetalhe}>{formatarValor(atual.sea_surface_temperature, '°C', 0)}</span>
        </div>
        <div className={styles.fato}>
          {mare?.subindo ? <ArrowUp size={20} className={styles.fatoIcone} /> : <ArrowDown size={20} className={styles.fatoIcone} />}
          <span className={styles.fatoRotulo}>Maré</span>
          <span className={styles.fatoValor}>{mare ? (mare.subindo ? 'Subindo' : 'Baixando') : '—'}</span>
          <span className={styles.fatoDetalhe}>
            {mare?.proximas[0]
              ? `${mare.proximas[0].tipo === 'alta' ? 'Cheia' : 'Seca'} às ${horaCurta(mare.proximas[0].dataHora)}`
              : 'sem dado'}
          </span>
        </div>
        <div className={styles.fato}>
          <Navigation size={20} className={styles.fatoIcone} />
          <span className={styles.fatoRotulo}>Correnteza</span>
          <span className={styles.fatoValor}>{corrente ?? '—'}</span>
          <span className={styles.fatoDetalhe}>{formatarValor(atual.ocean_current_velocity, 'km/h', 1)}</span>
        </div>
        <div className={styles.fato}>
          <Waves size={20} className={styles.fatoIcone} />
          <span className={styles.fatoRotulo}>Tamanho da onda</span>
          <span className={styles.fatoValor}>{formatarValor(atual.wave_height, 'm', 1)}</span>
          <span className={styles.fatoDetalhe}>{tamanhoNoCorpo(atual.wave_height)}</span>
        </div>
      </div>

      {/* Atividades */}
      <div className={styles.bloco}>
        <h3 className={styles.blocoTitulo}>Dá pra fazer agora?</h3>
        <div className={styles.atividades}>
          {listaAtividades.map((atividade) => {
            const nivel = ATIVIDADE_NIVEL[atividade.nivel]
            const IconeAtividade = ICONE_ATIVIDADE[atividade.id]
            const IconeNivelAtividade = nivel.icone
            return (
              <div key={atividade.id} className={styles.atividade}>
                <span className={styles.atividadeTitulo}>
                  <IconeAtividade size={16} /> {atividade.titulo}
                </span>
                <span className={styles.atividadeNivel}>
                  <IconeNivelAtividade size={18} style={{ color: nivel.cor }} aria-hidden="true" />
                  {nivel.rotulo}
                </span>
                <span className={styles.atividadeMotivo}>{atividade.motivo}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className={styles.duasColunas}>
        {/* Próximas horas */}
        {turnos.length > 0 && (
          <div className={styles.bloco}>
            <h3 className={styles.blocoTitulo}>Nas próximas horas</h3>
            <ul className={styles.lista}>
              {turnos.map((turno) => (
                <li key={turno.chave} className={styles.linha}>
                  <span className={styles.linhaQuando}>
                    {nomeDoDia(turno.data)} · {turno.turno.titulo}
                  </span>
                  <SeloNivel nivel={turno.nivel} pequeno />
                  <span className={styles.linhaDetalhe}>
                    {formatarValor(turno.altura, 'm', 1)} · {tamanhoNoCorpo(turno.altura)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Marés */}
        {mare?.proximas.length > 0 && (
          <div className={styles.bloco}>
            <h3 className={styles.blocoTitulo}>Horário das marés</h3>
            <ul className={styles.lista}>
              {mare.proximas.map((m) => (
                <li key={m.dataHora} className={styles.linha}>
                  <span className={styles.linhaQuando}>
                    {nomeDoDia(m.dataHora.slice(0, 10))} às {horaCurta(m.dataHora)}
                  </span>
                  <span className={styles.selo}>
                    {m.tipo === 'alta' ? <ArrowUp size={14} aria-hidden="true" /> : <ArrowDown size={14} aria-hidden="true" />}
                    {m.tipo === 'alta' ? 'Maré cheia' : 'Maré seca'}
                  </span>
                  <span className={styles.linhaDetalhe}>
                    {m.tipo === 'alta' ? 'Faixa de areia menor' : 'Faixa de areia maior'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Semana */}
      <div className={styles.bloco}>
        <h3 className={styles.blocoTitulo}>Próximos 7 dias</h3>
        <ul className={styles.semana}>
          {semana.dias.map((dia) => (
            <li key={dia.data} className={`${styles.dia} ${dia.data === semana.maisCalmo ? styles.diaMaisCalmo : ''}`}>
              <span className={styles.diaNome}>{nomeDoDia(dia.data, dia.diaSemana)}</span>
              <span className={styles.diaData}>{`${dia.data.slice(8, 10)}/${dia.data.slice(5, 7)}`}</span>
              <SeloNivel nivel={dia.nivel} pequeno />
              <span className={styles.diaOnda}>{formatarValor(dia.wave_height_max, 'm', 1)}</span>
              <span className={styles.diaCorpo}>{tamanhoNoCorpo(dia.wave_height_max)}</span>
              {dia.data === semana.maisCalmo && (
                <span className={styles.diaEtiqueta}>
                  <Star size={11} aria-hidden="true" /> Mais calmo
                </span>
              )}
            </li>
          ))}
        </ul>
        <div className={styles.legendaNiveis}>
          {NIVEIS_MAR.map((nivel) => (
            <SeloNivel key={nivel.id} nivel={nivel} pequeno />
          ))}
        </div>
      </div>

      <p className={styles.aviso}>
        <LifeBuoy size={16} aria-hidden="true" />
        Isto é uma previsão feita por computador e pode errar. Na praia, siga sempre a bandeira e as orientações do
        salva-vidas.
      </p>
    </div>
  )
}

export default VisaoSimples
