import { useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Radio, Maximize2, ChevronDown } from 'lucide-react'
import Modal from './Modal'
import { TEXTOS } from '../services/textos'
import styles from './EstacaoCabecalho.module.css'

// Formata grau decimal em "22.9194° S" / "42.8186° O".
function formatarCoordenada(valor, positivo, negativo) {
  const letra = valor >= 0 ? positivo : negativo
  return `${Math.abs(valor).toFixed(4)}° ${letra}`
}

function Mapa({ coordenadas, nome, altura }) {
  return (
    <MapContainer
      // `key` força o Leaflet a remontar (e recentralizar) quando a
      // coordenada muda — `center` sozinho só vale na primeira montagem.
      key={`${coordenadas.latitude},${coordenadas.longitude}`}
      center={[coordenadas.latitude, coordenadas.longitude]}
      zoom={11}
      scrollWheelZoom={false}
      className={styles.mapa}
      style={{ height: altura }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CircleMarker
        center={[coordenadas.latitude, coordenadas.longitude]}
        radius={9}
        pathOptions={{ color: 'var(--color-accent)', fillOpacity: 0.85 }}
      >
        <Popup>{nome}</Popup>
      </CircleMarker>
    </MapContainer>
  )
}

// Cabeçalho: seletor de Cidade/Estado (catálogo do IBGE) + status + mapa.
// `coordenadas` fica null enquanto a cidade escolhida ainda está sendo
// geocodificada.
function EstacaoCabecalho({
  cidade,
  uf,
  online,
  coordenadas,
  carregandoLocalizacao,
  ufs,
  municipios,
  onMudarUf,
  onMudarCidade,
}) {
  const [mapaExpandido, setMapaExpandido] = useState(false)
  const coordenadaTexto = coordenadas
    ? `${formatarCoordenada(coordenadas.latitude, 'N', 'S')}, ${formatarCoordenada(coordenadas.longitude, 'L', 'O')}`
    : TEXTOS.localizando

  return (
    <div className={styles.cabecalho}>
      <div className={styles.identidade}>
        <span className={styles.avatar}>
          <Radio size={22} />
        </span>
        <div className={styles.textos}>
          <div className={styles.linhaNome}>
            <div className={styles.seletoresLocalizacao}>
              <span className={styles.chip}>
                <select
                  id="cidade-selecionada"
                  className={styles.chipSelect}
                  value={cidade}
                  onChange={(evento) => onMudarCidade(evento.target.value)}
                  disabled={municipios.length === 0}
                  aria-label={TEXTOS.escolherCidade}
                >
                  {municipios.length === 0 && <option value="">{TEXTOS.carregandoCidades}</option>}
                  {municipios.map((municipio) => (
                    <option key={municipio.codigo} value={municipio.nome}>
                      {municipio.nome}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className={styles.chipChevron} />
              </span>

              <span className={styles.chip}>
                <select
                  id="uf-selecionada"
                  className={`${styles.chipSelect} ${styles.chipSelectUf}`}
                  value={uf}
                  onChange={(evento) => onMudarUf(evento.target.value)}
                  aria-label={TEXTOS.escolherEstado}
                >
                  {ufs.map((sigla) => (
                    <option key={sigla} value={sigla}>
                      {sigla}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className={styles.chipChevron} />
              </span>
            </div>

            <span className={`${styles.status} ${online ? styles.statusOnline : styles.statusOffline}`}>
              <span className={styles.pontoStatus} />
              {online ? TEXTOS.online : TEXTOS.offline}
            </span>
          </div>

          <span className={styles.coordenadas}>{carregandoLocalizacao ? TEXTOS.localizando : coordenadaTexto}</span>
        </div>
      </div>

      <div className={styles.mapaContainer}>
        {coordenadas && <Mapa coordenadas={coordenadas} nome={cidade} altura="100%" />}
        <button
          type="button"
          className={styles.botaoExpandir}
          onClick={() => setMapaExpandido(true)}
          aria-label={TEXTOS.expandirMapa}
          title={TEXTOS.expandirMapa}
          disabled={!coordenadas}
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {coordenadas && (
        <Modal aberto={mapaExpandido} onFechar={() => setMapaExpandido(false)} titulo={cidade} icone={Radio}>
          <Mapa coordenadas={coordenadas} nome={cidade} altura="60vh" />
        </Modal>
      )}
    </div>
  )
}

export default EstacaoCabecalho
