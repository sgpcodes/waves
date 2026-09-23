import { ArrowUp } from 'lucide-react'
import { rotacaoSeta } from '../../services/marinha'

// Seta que aponta pra onde a onda/corrente vai (ver `rotacaoSeta`).
function Seta({ variavel, graus, tamanho = 14 }) {
  const rotacao = rotacaoSeta(variavel, graus)
  if (rotacao == null) return null
  return (
    <ArrowUp
      size={tamanho}
      aria-hidden="true"
      style={{ transform: `rotate(${rotacao}deg)`, flexShrink: 0, color: 'var(--color-accent)' }}
    />
  )
}

export default Seta
