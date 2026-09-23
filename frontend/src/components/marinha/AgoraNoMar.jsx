import { Waves, Wind, Thermometer, Navigation, ArrowUpDown } from 'lucide-react'
import Seta from './Seta'
import { direcaoTexto, formatarValor } from '../../services/marinha'
import styles from './PrevisaoMaritima.module.css'

// Monta um card de "sistema de ondas" (total, swell 1/2/3, vento) a partir
// do prefixo da variável — todos têm altura, período e direção.
function cardDeOnda(atual, unidades, prefixo, titulo, icone) {
  const altura = atual[`${prefixo}_height`]
  const periodo = atual[`${prefixo}_period`]
  const pico = atual[`${prefixo}_peak_period`]
  const direcao = atual[`${prefixo}_direction`]
  return {
    chave: prefixo,
    titulo,
    icone,
    valor: formatarValor(altura, unidades[`${prefixo}_height`], 2),
    vazio: altura == null,
    linhas: [
      { rotulo: 'Período', valor: formatarValor(periodo, unidades[`${prefixo}_period`]) },
      pico != null && { rotulo: 'Período de pico', valor: formatarValor(pico, unidades[`${prefixo}_peak_period`]) },
      prefixo === 'wave' && atual.wave_energy != null && { rotulo: 'Energia', valor: formatarValor(atual.wave_energy, 'J/m²', 0) },
      prefixo === 'wave' && atual.wave_power != null && { rotulo: 'Potência', valor: formatarValor(atual.wave_power, 'kW/m', 1) },
      {
        rotulo: 'Vem de',
        valor: direcao != null ? `${direcaoTexto(direcao)} · ${Math.round(direcao)}°` : '—',
        seta: { variavel: `${prefixo}_direction`, graus: direcao },
      },
    ].filter(Boolean),
  }
}

// "Agora no mar": todas as 23 variáveis do `current` da API (modelo padrão),
// agrupadas por assunto.
function AgoraNoMar({ atual, unidades }) {
  const cards = [
    cardDeOnda(atual, unidades, 'wave', 'Ondas (total)', Waves),
    cardDeOnda(atual, unidades, 'swell_wave', 'Swell primário', Waves),
    cardDeOnda(atual, unidades, 'secondary_swell_wave', 'Swell secundário', Waves),
    cardDeOnda(atual, unidades, 'tertiary_swell_wave', 'Swell terciário', Waves),
    cardDeOnda(atual, unidades, 'wind_wave', 'Onda de vento', Wind),
    {
      chave: 'agua',
      titulo: 'Temperatura da água',
      icone: Thermometer,
      valor: formatarValor(atual.sea_surface_temperature, unidades.sea_surface_temperature),
      vazio: atual.sea_surface_temperature == null,
      linhas: [],
    },
    {
      chave: 'corrente',
      titulo: 'Corrente oceânica',
      icone: Navigation,
      valor: formatarValor(atual.ocean_current_velocity, unidades.ocean_current_velocity),
      vazio: atual.ocean_current_velocity == null,
      linhas: [
        {
          rotulo: 'Vai para',
          valor: atual.ocean_current_direction != null
            ? `${direcaoTexto(atual.ocean_current_direction)} · ${Math.round(atual.ocean_current_direction)}°`
            : '—',
          seta: { variavel: 'ocean_current_direction', graus: atual.ocean_current_direction },
        },
      ],
    },
    {
      chave: 'nivel',
      titulo: 'Nível do mar',
      icone: ArrowUpDown,
      valor: formatarValor(atual.sea_level_height_msl, unidades.sea_level_height_msl, 2),
      vazio: atual.sea_level_height_msl == null,
      linhas: [
        { rotulo: 'Barômetro inverso', valor: formatarValor(atual.invert_barometer_height, unidades.invert_barometer_height, 2) },
      ],
    },
  ]

  return (
    <div className={styles.bloco}>
      <div className={styles.blocoCabecalho}>
        <h3 className={styles.blocoTitulo}>Agora no mar</h3>
        <span className={styles.blocoNota}>Modelo padrão da API · {atual.time ? atual.time.slice(11, 16) : '—'}</span>
      </div>
      <div className={styles.gradeAgora}>
        {cards.map(({ chave, titulo, icone: Icone, valor, vazio, linhas }) => (
          <div key={chave} className={`${styles.cardAgora} ${vazio ? styles.cardAgoraVazio : ''}`}>
            <span className={styles.cardAgoraTitulo}>
              <Icone size={14} /> {titulo}
            </span>
            <span className={styles.cardAgoraValor}>{vazio ? 'Sem dado' : valor}</span>
            {!vazio &&
              linhas.map((linha) => (
                <span key={linha.rotulo} className={styles.cardAgoraLinha}>
                  <span>{linha.rotulo}</span>
                  <span className={styles.cardAgoraLinhaValor}>
                    {linha.seta && <Seta variavel={linha.seta.variavel} graus={linha.seta.graus} tamanho={12} />}
                    {linha.valor}
                  </span>
                </span>
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default AgoraNoMar
