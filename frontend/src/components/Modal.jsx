import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { TEXTOS } from '../services/textos'
import styles from './Modal.module.css'

// Janela por cima do conteúdo — usada pra "expandir" o mapa. Fecha com o
// X, clicando fora, ou Esc. Renderizada via portal no <body>; as cores do
// tema continuam valendo porque o data-theme fica no <html>.
function Modal({ aberto, onFechar, titulo, icone: Icone, children }) {
  useEffect(() => {
    if (!aberto) return
    function aoTeclar(evento) {
      if (evento.key === 'Escape') onFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aberto, onFechar])

  if (!aberto) return null

  return createPortal(
    <div className={styles.fundo} onClick={onFechar}>
      <div className={styles.painel} onClick={(evento) => evento.stopPropagation()}>
        <div className={styles.cabecalho}>
          <h2 className={styles.titulo}>
            {Icone && <Icone size={18} />}
            {titulo}
          </h2>
          <button type="button" className={styles.botaoFechar} onClick={onFechar} aria-label={TEXTOS.fechar}>
            <X size={18} />
          </button>
        </div>
        <div className={styles.corpo}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}

export default Modal
