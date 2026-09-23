import { useEffect, useState } from 'react'
import EstacaoCabecalho from '../components/EstacaoCabecalho'
import PrevisaoSemana from '../components/PrevisaoSemana'
import StatusMessage from '../components/StatusMessage'
import PrevisaoMaritima from '../components/marinha/PrevisaoMaritima'
import { buscarClima, buscarMunicipiosPorUf, buscarUfs, geocodificarCidade } from '../services/api'
import { TEXTOS } from '../services/textos'
import styles from './Dashboard.module.css'

// Dashboard: cabeçalho com seletor de Cidade/Estado + mapa, e a previsão
// de 15 dias com o painel "Hoje"; embaixo, a previsão marítima do RJ
// (components/marinha). Tudo vem do backend (backend/clima), que
// fala com IBGE e Open-Meteo e guarda municípios/coordenadas no banco.
const INTERVALO_ATUALIZACAO_MS = 60_000
const CHAVE_UF = 'ondas:ufSelecionada'
const CHAVE_CIDADE = 'ondas:cidadeSelecionada'
const UF_PADRAO = 'RJ'
const CIDADE_PADRAO = 'Maricá'

function lerPreferencia(chave, padrao) {
  try {
    return localStorage.getItem(chave) ?? padrao
  } catch {
    return padrao
  }
}

function salvarPreferencia(chave, valor) {
  try {
    localStorage.setItem(chave, valor)
  } catch {
    // navegador sem storage (aba anônima etc.) — só não lembra a escolha
  }
}

function Dashboard() {
  const [uf, setUf] = useState(() => lerPreferencia(CHAVE_UF, UF_PADRAO))
  const [ufs, setUfs] = useState(() => [uf])
  const [cidade, setCidade] = useState(() => lerPreferencia(CHAVE_CIDADE, CIDADE_PADRAO))
  const [municipios, setMunicipios] = useState([])
  const [coordenadas, setCoordenadas] = useState(null)
  const [carregandoLocalizacao, setCarregandoLocalizacao] = useState(true)
  const [clima, setClima] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    buscarUfs()
      .then(setUfs)
      .catch(() => {})
  }, [])

  // Troca de estado: busca os municípios dele. Se a cidade atual não
  // existir na lista (trocou de estado), cai na primeira.
  useEffect(() => {
    let cancelado = false
    setMunicipios([])
    buscarMunicipiosPorUf(uf)
      .then((lista) => {
        if (cancelado) return
        setMunicipios(lista)
        if (!lista.some((m) => m.nome === cidade)) {
          setCidade(lista[0]?.nome ?? '')
        }
      })
      .catch(() => {
        if (!cancelado) setMunicipios([])
      })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uf])

  // Troca de cidade: resolve a coordenada (o IBGE não dá lat/long).
  useEffect(() => {
    if (!cidade) return
    let cancelado = false
    setCarregandoLocalizacao(true)
    geocodificarCidade(cidade, uf)
      .then((coords) => {
        if (!cancelado) setCoordenadas(coords)
      })
      .catch(() => {
        if (!cancelado) {
          setCoordenadas(null)
          setErro(TEXTOS.erroBusca)
        }
      })
      .finally(() => {
        if (!cancelado) setCarregandoLocalizacao(false)
      })
    return () => {
      cancelado = true
    }
  }, [cidade, uf])

  // Busca o clima da coordenada a cada 1 min — trocar de cidade refaz na hora.
  useEffect(() => {
    if (!coordenadas) return
    let cancelado = false
    setCarregando(true)
    setClima(null) // cidade nova: não mostra a previsão da cidade anterior

    async function carregar() {
      try {
        const dados = await buscarClima(coordenadas)
        if (!cancelado) {
          setClima(dados)
          setErro(null)
        }
      } catch {
        if (!cancelado) setErro(TEXTOS.erroBusca)
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
  }, [coordenadas])

  function aoMudarUf(novaUf) {
    setUf(novaUf)
    salvarPreferencia(CHAVE_UF, novaUf)
  }

  function aoMudarCidade(novaCidade) {
    setCidade(novaCidade)
    salvarPreferencia(CHAVE_CIDADE, novaCidade)
  }

  const cabecalho = (
    <EstacaoCabecalho
      cidade={cidade}
      uf={uf}
      online={!erro}
      coordenadas={coordenadas}
      carregandoLocalizacao={carregandoLocalizacao}
      ufs={ufs}
      municipios={municipios}
      onMudarUf={aoMudarUf}
      onMudarCidade={aoMudarCidade}
    />
  )

  // Se uma atualização falhar mas já existe previsão carregada, continua
  // mostrando a última (o selo do cabeçalho vira "Offline") e tenta de novo
  // no próximo ciclo — em vez de apagar tudo e mostrar só a mensagem de erro.
  let conteudo
  if (clima) {
    conteudo = <PrevisaoSemana clima={clima} cidade={cidade} />
  } else if (carregando) {
    conteudo = <StatusMessage texto={TEXTOS.carregando} />
  } else {
    conteudo = <StatusMessage texto={erro ?? TEXTOS.erroBusca} />
  }

  return (
    <div className={styles.pagina}>
      {cabecalho}
      {conteudo}
      <PrevisaoMaritima />
    </div>
  )
}

export default Dashboard
