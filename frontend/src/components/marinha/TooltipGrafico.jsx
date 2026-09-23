import styles from './PrevisaoMaritima.module.css'

// Tooltip dos gráficos: valor em destaque, nome da série depois, com um
// traço da cor da série (não caixa) — mostra todas as séries naquele ponto.
function TooltipGrafico({ active, payload, label, formatarRotulo, unidade, casas = 2 }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipTitulo}>{formatarRotulo ? formatarRotulo(label) : label}</span>
      {payload
        .filter((item) => item.value != null)
        .map((item) => (
          <span key={item.dataKey} className={styles.tooltipLinha}>
            <span className={styles.tooltipTraco} style={{ backgroundColor: item.color }} />
            <strong>
              {Number(item.value).toLocaleString('pt-BR', { maximumFractionDigits: casas })}
              {unidade ? ` ${unidade}` : ''}
            </strong>
            <span className={styles.tooltipNome}>{item.name}</span>
          </span>
        ))}
    </div>
  )
}

export default TooltipGrafico
