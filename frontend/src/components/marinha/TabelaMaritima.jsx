import { useMemo, useState } from 'react'
import Seta from './Seta'
import { ROTULO_CURTO, ROTULO_VARIAVEL, direcaoTexto, ehDirecao, formatarDataHora, formatarValor, indiceAgora } from '../../services/marinha'
import styles from './PrevisaoMaritima.module.css'

const JANELAS = [
  { valor: 24, rotulo: '24 h' },
  { valor: 72, rotulo: '3 dias' },
  { valor: Infinity, rotulo: 'Tudo' },
]

// Tabela hora a hora de um modelo, com TODAS as variáveis que ele tem —
// é também a "versão em tabela" dos gráficos (valores sem precisar passar
// o mouse).
function TabelaMaritima({ horaria, modelos, unidades }) {
  const modelosComDado = modelos.filter((m) => horaria.series[m.id])
  const [modeloId, setModeloId] = useState(modelosComDado[0]?.id)
  const [janela, setJanela] = useState(24)
  const modelo = modelosComDado.find((m) => m.id === modeloId) ?? modelosComDado[0]

  const colunas = useMemo(
    () => Object.keys(ROTULO_VARIAVEL).filter((v) => horaria.series[modelo?.id]?.[v]),
    [horaria, modelo],
  )

  const linhas = useMemo(() => {
    if (!modelo) return []
    const inicio = indiceAgora(horaria.tempo)
    const serie = horaria.series[modelo.id]
    const fim = janela === Infinity ? horaria.tempo.length : inicio + janela
    return horaria.tempo
      .slice(inicio, fim)
      .map((t, deslocamento) => ({ t, valores: colunas.map((v) => serie[v][inicio + deslocamento]) }))
      .filter((linha) => linha.valores.some((valor) => valor != null))
  }, [horaria, modelo, colunas, janela])

  if (!modelo) return null

  return (
    <div className={styles.bloco}>
      <div className={styles.blocoCabecalho}>
        <h3 className={styles.blocoTitulo}>Hora a hora por modelo</h3>
        <span className={styles.blocoNota}>
          {modelo.nome} · {colunas.length} variáveis
        </span>
      </div>

      <div className={styles.filtros}>
        <div className={styles.chips} role="group" aria-label="Modelo">
          {modelosComDado.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`${styles.chipBotao} ${m.id === modelo.id ? styles.chipBotaoAtivo : ''}`}
              onClick={() => setModeloId(m.id)}
            >
              {m.nome}
            </button>
          ))}
        </div>
        <div className={styles.chips} role="group" aria-label="Período">
          {JANELAS.map((j) => (
            <button
              key={j.rotulo}
              type="button"
              className={`${styles.chipBotao} ${j.valor === janela ? styles.chipBotaoAtivo : ''}`}
              onClick={() => setJanela(j.valor)}
            >
              {j.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.tabelaRolagem}>
        <table className={styles.tabela}>
          <thead>
            <tr>
              <th scope="col">Hora</th>
              {colunas.map((v) => (
                <th key={v} scope="col" title={ROTULO_VARIAVEL[v]}>
                  {ROTULO_CURTO[v]}
                  {unidades[v] && !ehDirecao(v) && <span className={styles.tabelaUnidade}>{unidades[v]}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.t}>
                <th scope="row">{formatarDataHora(linha.t)}</th>
                {linha.valores.map((valor, i) => {
                  const variavel = colunas[i]
                  if (ehDirecao(variavel)) {
                    return (
                      <td key={variavel}>
                        {valor == null ? (
                          '—'
                        ) : (
                          <span className={styles.celulaDirecao}>
                            <Seta variavel={variavel} graus={valor} tamanho={12} />
                            {direcaoTexto(valor)} {Math.round(valor)}°
                          </span>
                        )}
                      </td>
                    )
                  }
                  return <td key={variavel}>{formatarValor(valor, null, 2)}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TabelaMaritima
