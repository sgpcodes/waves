import { Info } from 'lucide-react'
import styles from './PrevisaoMaritima.module.css'

// Agrupa as variáveis técnicas da API em assuntos que qualquer pessoa entende.
const ASSUNTOS = [
  { rotulo: 'Ondas', eh: (v) => v.startsWith('wave_') },
  { rotulo: 'Swell', eh: (v) => v.includes('swell') },
  { rotulo: 'Ondas de vento', eh: (v) => v.startsWith('wind_wave') },
  { rotulo: 'Correntes', eh: (v) => v.startsWith('ocean_current') },
  { rotulo: 'Temperatura da água', eh: (v) => v === 'sea_surface_temperature' },
  { rotulo: 'Maré', eh: (v) => v === 'sea_level_height_msl' || v === 'invert_barometer_height' },
]

function assuntosDoModelo(variaveis) {
  return ASSUNTOS.filter((assunto) => variaveis.some(assunto.eh)).map((assunto) => assunto.rotulo)
}

// "Modelos usados" explicado pra quem não é da área: o que é um modelo,
// como ler os números, e pra que serve cada um.
function ModelosUsados({ modelos }) {
  return (
    <div className={styles.bloco}>
      <div className={styles.blocoCabecalho}>
        <h3 className={styles.blocoTitulo}>De onde vêm esses dados</h3>
        <span className={styles.blocoNota}>Open-Meteo Marine API · plano gratuito</span>
      </div>

      <div className={styles.explicacaoModelos}>
        <Info size={18} className={styles.explicacaoIcone} />
        <div>
          <p>
            <strong>O que é um modelo?</strong> É um programa de computador que simula o oceano e calcula como as ondas, as
            correntes e a maré vão se comportar nos próximos dias. Vários serviços de meteorologia do mundo têm o seu, e cada
            um calcula de um jeito — por isso as previsões às vezes discordam (veja o gráfico de comparação acima).
          </p>
          <p>
            <strong>Como ler os cards:</strong> <em>Enxerga detalhes de</em> é o tamanho do "quadradinho" em que o modelo
            divide o mar — quanto menor, mais preciso perto da praia. <em>Prevê até</em> é quantos dias pra frente ele
            alcança. <em>Nova previsão</em> é de quanto em quanto tempo ele é recalculado.
          </p>
        </div>
      </div>

      <div className={styles.gradeModelos}>
        {modelos.map((modelo) => (
          <div key={modelo.id} className={styles.cardModelo}>
            <span className={styles.cardModeloNome}>{modelo.nome}</span>
            <span className={styles.cardModeloFornecedor}>{modelo.fornecedor}</span>
            <p className={styles.cardModeloDescricao}>{modelo.descricao}</p>
            <dl className={styles.cardModeloLista}>
              <dt>Enxerga detalhes de</dt>
              <dd>{modelo.resolucao}</dd>
              <dt>{modelo.id === 'era5_ocean' ? 'Cobre' : 'Prevê até'}</dt>
              <dd>{modelo.horizonte}</dd>
              <dt>Nova previsão</dt>
              <dd>{modelo.atualizacao}</dd>
            </dl>
            <div className={styles.cardModeloAssuntos}>
              <span className={styles.cardModeloAssuntosRotulo}>Mede:</span>
              {assuntosDoModelo(modelo.variaveis).map((assunto) => (
                <span key={assunto} className={styles.etiqueta}>
                  {assunto}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className={styles.aviso}>
        A API tem mais dois modelos (DWD EWAM e GFS Wave 0,16°), mas eles só cobrem outras partes do mundo — aqui no Rio não
        devolvem nenhum dado, então ficaram de fora.
      </p>
    </div>
  )
}

export default ModelosUsados
