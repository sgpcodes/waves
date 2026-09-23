import { useEffect, useMemo, useRef, useState } from 'react'
import { Anchor, BarChart3, MapPin, Smile, Waves } from 'lucide-react'
import AgoraNoMar from './AgoraNoMar'
import DiasMar from './DiasMar'
import MareCorrentes from './MareCorrentes'
import ComparacaoModelos from './ComparacaoModelos'
import TabelaMaritima from './TabelaMaritima'
import HistoricoEra5 from './HistoricoEra5'
import ModelosUsados from './ModelosUsados'
import VisaoSimples from './VisaoSimples'
import VisaoIntermediaria from './VisaoIntermediaria'
import { buscarPontosMaritimos, buscarPrevisaoMaritima } from '../../services/api'
import styles from './PrevisaoMaritima.module.css'

const INTERVALO_ATUALIZACAO_MS = 10 * 60_000 // o backend guarda 30 min em cache
const CHAVE_PONTO = 'ondas:pontoMaritimo'
const PONTO_PADRAO = 'copacabana-ipanema'
const CHAVE_VISAO = 'ondas:visaoMaritima'

const VISOES = [
  { id: 'tecnica', rotulo: 'Técnica', rotuloCurto: 'Técnica', icone: BarChart3 },
  { id: 'intermediaria', rotulo: 'Intermediária', rotuloCurto: 'Intermed.', icone: Waves },
  { id: 'simples', rotulo: 'Simples', rotuloCurto: 'Simples', icone: Smile },
]

function lerVisao() {
  try {
    const salva = localStorage.getItem(CHAVE_VISAO)
    return VISOES.some((v) => v.id === salva) ? salva : 'tecnica'
  } catch {
    return 'tecnica'
  }
}

function lerPonto() {
  try {
    return localStorage.getItem(CHAVE_PONTO)
  } catch {
    return null
  }
}

function salvarPonto(slug) {
  try {
    localStorage.setItem(CHAVE_PONTO, slug)
  } catch {
    // sem storage — só não lembra a escolha
  }
}

// Previsão marítima do litoral do Rio de Janeiro (Open-Meteo Marine, via
// backend): ponto da costa, agora, próximos dias, maré/correntes, comparação
// entre os modelos, tabela hora a hora e histórico ERA5.
function PrevisaoMaritima() {
  const [pontos, setPontos] = useState([])
  const [ponto, setPonto] = useState(lerPonto)
  const [previsao, setPrevisao] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [visao, setVisao] = useState(lerVisao)
  // Barra fixa do celular: aparece quando o cartão do topo (praia + abas)
  // sai da tela, pra dar pra trocar de visão sem rolar tudo de volta.
  const refTopo = useRef(null)
  const refConteudo = useRef(null)
  const [topoVisivel, setTopoVisivel] = useState(true)

  useEffect(() => {
    const alvo = refTopo.current
    if (!alvo || typeof IntersectionObserver === 'undefined') return
    const observador = new IntersectionObserver(([entrada]) => setTopoVisivel(entrada.isIntersecting))
    observador.observe(alvo)
    return () => observador.disconnect()
  }, [])

  useEffect(() => {
    buscarPontosMaritimos()
      .then((lista) => {
        setPontos(lista)
        setPonto((atual) => {
          if (lista.some((p) => p.slug === atual)) return atual
          return lista.some((p) => p.slug === PONTO_PADRAO) ? PONTO_PADRAO : (lista[0]?.slug ?? null)
        })
      })
      .catch(() => setErro('Não foi possível carregar os pontos da costa.'))
  }, [])

  useEffect(() => {
    if (!ponto) return
    let cancelado = false
    setCarregando(true)

    async function carregar() {
      try {
        const dados = await buscarPrevisaoMaritima(ponto)
        if (!cancelado) {
          setPrevisao(dados)
          setErro(null)
        }
      } catch {
        if (!cancelado) setErro('Não foi possível buscar a previsão marítima agora. Tentando de novo em instantes.')
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    carregar()
    const intervalo = setInterval(carregar, INTERVALO_ATUALIZACAO_MS)
    return () => {
      cancelado = true
      clearInterval(intervalo)
    }
  }, [ponto])

  // Agrupa os pontos por região (na ordem em que vêm do backend: do sul
  // pro norte do litoral).
  const regioes = useMemo(() => {
    const porRegiao = new Map()
    pontos.forEach((p) => {
      const grupo = porRegiao.get(p.regiao) ?? { id: p.regiao, nome: p.regiaoNome, pontos: [] }
      grupo.pontos.push(p)
      porRegiao.set(p.regiao, grupo)
    })
    return Array.from(porRegiao.values())
  }, [pontos])

  const regiaoDoPonto = pontos.find((p) => p.slug === ponto)?.regiao
  const [regiaoEscolhida, setRegiaoEscolhida] = useState(null)
  const regiaoAtiva = regiaoEscolhida ?? regiaoDoPonto ?? regioes[0]?.id
  const pontosDaRegiao = regioes.find((r) => r.id === regiaoAtiva)?.pontos ?? []

  function aoEscolherVisao(id, { rolarProTopo = false } = {}) {
    setVisao(id)
    if (rolarProTopo) {
      const topo = refConteudo.current?.getBoundingClientRect().top ?? 0
      window.scrollTo({ top: window.scrollY + topo - 64, behavior: 'smooth' })
    }
    try {
      localStorage.setItem(CHAVE_VISAO, id)
    } catch {
      // sem storage — só não lembra a escolha
    }
  }

  function aoEscolherPonto(slug) {
    setPonto(slug)
    salvarPonto(slug)
  }

  // Ao trocar de ponto, mantém a previsão anterior visível (mais apagada)
  // até a nova chegar — sem piscar a seção inteira.
  const recarregando = carregando && previsao && previsao.ponto.slug !== ponto

  return (
    <section className={styles.secao} aria-labelledby="titulo-previsao-maritima">
      <div className={styles.cartaoTopo} ref={refTopo}>
        <div className={styles.cabecalho}>
          <span className={styles.iconeCabecalho}>
            <Anchor size={24} />
          </span>
          <div className={styles.cabecalhoTextos}>
            <h2 id="titulo-previsao-maritima" className={styles.titulo}>
              Previsão marítima — litoral do Rio de Janeiro
            </h2>
            <p className={styles.subtitulo}>
              {pontos.length} pontos de Paraty à divisa com o Espírito Santo. Ondas, swell, maré, correntes e temperatura da
              água, com todos os modelos gratuitos da Open-Meteo Marine API.
            </p>
          </div>
          <div className={styles.seletorVisao} role="tablist" aria-label="Tipo de visualização">
            {VISOES.map(({ id, rotulo, icone: Icone }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={visao === id}
                className={`${styles.botaoVisao} ${visao === id ? styles.botaoVisaoAtivo : ''}`}
                onClick={() => aoEscolherVisao(id)}
              >
                <Icone size={15} /> {rotulo}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.regioes} role="tablist" aria-label="Região do litoral">
          {regioes.map((r) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={r.id === regiaoAtiva}
              className={`${styles.abaRegiao} ${r.id === regiaoAtiva ? styles.abaRegiaoAtiva : ''}`}
              onClick={() => setRegiaoEscolhida(r.id)}
            >
              {r.nome}
              <span className={styles.abaRegiaoContagem}>{r.pontos.length}</span>
            </button>
          ))}
        </div>

        <div className={styles.pontos} role="group" aria-label="Praia">
          {pontosDaRegiao.map((p) => (
            <button
              key={p.slug}
              type="button"
              className={`${styles.chipBotao} ${p.slug === ponto ? styles.chipBotaoAtivo : ''}`}
              onClick={() => aoEscolherPonto(p.slug)}
            >
              <MapPin size={13} /> {p.nome}
            </button>
          ))}
          {previsao?.grade?.latitude != null && (
            <span className={styles.gradeInfo}>
              Célula do modelo: {Math.abs(previsao.grade.latitude).toFixed(3)}° S, {Math.abs(previsao.grade.longitude).toFixed(3)}° O
            </span>
          )}
        </div>
      </div>

      <div
        className={`${styles.barraFixa} ${!topoVisivel ? styles.barraFixaVisivel : ''}`}
        aria-hidden={topoVisivel}
      >
        <div className={styles.barraFixaCaixa}>
          <span className={styles.barraFixaPonto}>
            <MapPin size={12} /> {pontos.find((p) => p.slug === ponto)?.nome ?? ''}
          </span>
          <div className={styles.barraFixaAbas} role="tablist" aria-label="Tipo de visualização">
            {VISOES.map(({ id, rotuloCurto, icone: Icone }) => (
              <button
                key={id}
                type="button"
                role="tab"
                tabIndex={topoVisivel ? -1 : 0}
                aria-selected={visao === id}
                className={`${styles.barraFixaBotao} ${visao === id ? styles.barraFixaBotaoAtivo : ''}`}
                onClick={() => aoEscolherVisao(id, { rolarProTopo: true })}
              >
                <Icone size={14} /> {rotuloCurto}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div ref={refConteudo} className={styles.ancora} />

      {erro && !previsao && <p className={styles.mensagem}>{erro}</p>}
      {!erro && !previsao && carregando && <p className={styles.mensagem}>Carregando previsão marítima...</p>}

      {previsao && visao === 'intermediaria' && (
        <div className={`${styles.conteudo} ${recarregando ? styles.conteudoRecarregando : ''}`}>
          <VisaoIntermediaria previsao={previsao} />
        </div>
      )}

      {previsao && visao === 'simples' && (
        <div className={`${styles.conteudo} ${recarregando ? styles.conteudoRecarregando : ''}`}>
          <VisaoSimples previsao={previsao} />
        </div>
      )}

      {previsao && visao === 'tecnica' && (
        <div className={`${styles.conteudo} ${recarregando ? styles.conteudoRecarregando : ''}`}>
          <AgoraNoMar atual={previsao.atual} unidades={previsao.unidades} />
          <DiasMar dias={previsao.diaria} unidades={previsao.unidades} />
          <MareCorrentes quinzeMinutos={previsao.quinzeMinutos} unidades={previsao.unidades} />
          <ComparacaoModelos horaria={previsao.horaria} modelos={previsao.modelos} unidades={previsao.unidades} />
          <TabelaMaritima horaria={previsao.horaria} modelos={previsao.modelos} unidades={previsao.unidades} />
          <HistoricoEra5 historico={previsao.historico} unidades={previsao.unidades} />

          <ModelosUsados modelos={previsao.modelos} />
        </div>
      )}
    </section>
  )
}

export default PrevisaoMaritima
