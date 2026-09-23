import Seta from './Seta'
import { NOME_CURTO_MODELO, direcaoTexto, formatarData, formatarValor } from '../../services/marinha'
import styles from './PrevisaoMaritima.module.css'

// Previsão diária (as 11 variáveis diárias da API). O dia usa o modelo
// padrão; onde ele não chega (depois de ~10 dias), o backend completa com
// GFS/ECMWF — o selo mostra de qual modelo veio.
function DiasMar({ dias, unidades }) {
  if (!dias.length) return null

  return (
    <div className={styles.bloco}>
      <div className={styles.blocoCabecalho}>
        <h3 className={styles.blocoTitulo}>Próximos {dias.length} dias</h3>
        <span className={styles.blocoNota}>Máximas do dia · direção dominante</span>
      </div>
      <div className={styles.faixaDias}>
        {dias.map((dia, indice) => (
          <div key={dia.data} className={styles.diaMar}>
            <span className={styles.diaMarNome}>{indice === 0 ? 'Hoje' : dia.diaSemana}</span>
            <span className={styles.diaMarData}>{formatarData(dia.data)}</span>
            <span className={styles.diaMarOnda}>
              <Seta variavel="wave_direction" graus={dia.wave_direction_dominant} tamanho={16} />
              {formatarValor(dia.wave_height_max, unidades.wave_height_max, 1)}
            </span>
            <span className={styles.diaMarDirecao}>
              {dia.wave_direction_dominant != null ? `de ${direcaoTexto(dia.wave_direction_dominant)}` : '—'} ·{' '}
              {formatarValor(dia.wave_period_max, unidades.wave_period_max, 0)}
            </span>
            <dl className={styles.diaMarLista}>
              {dia.wave_energy_max != null && (
                <>
                  <dt>Energia máx.</dt>
                  <dd>{formatarValor(dia.wave_energy_max, 'J/m²', 0)}</dd>
                </>
              )}
              <dt>Swell</dt>
              <dd>
                {formatarValor(dia.swell_wave_height_max, unidades.swell_wave_height_max, 1)} ·{' '}
                {formatarValor(dia.swell_wave_period_max, unidades.swell_wave_period_max, 0)}
                {dia.swell_wave_direction_dominant != null && ` · ${direcaoTexto(dia.swell_wave_direction_dominant)}`}
              </dd>
              {dia.swell_wave_peak_period_max != null && (
                <>
                  <dt>Pico swell</dt>
                  <dd>{formatarValor(dia.swell_wave_peak_period_max, unidades.swell_wave_peak_period_max, 0)}</dd>
                </>
              )}
              <dt>Vento</dt>
              <dd>
                {formatarValor(dia.wind_wave_height_max, unidades.wind_wave_height_max, 1)} ·{' '}
                {formatarValor(dia.wind_wave_period_max, unidades.wind_wave_period_max, 0)}
                {dia.wind_wave_direction_dominant != null && ` · ${direcaoTexto(dia.wind_wave_direction_dominant)}`}
              </dd>
              {dia.wind_wave_peak_period_max != null && (
                <>
                  <dt>Pico vento</dt>
                  <dd>{formatarValor(dia.wind_wave_peak_period_max, unidades.wind_wave_peak_period_max, 0)}</dd>
                </>
              )}
            </dl>
            {dia.fonte !== 'best_match' && <span className={styles.selo}>{NOME_CURTO_MODELO[dia.fonte] ?? dia.fonte}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default DiasMar
