// Cliente do backend Django (backend/clima). A URL vem de VITE_API_URL,
// definida no .env local ou nas Environment Variables do Render.
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8010').replace(/\/$/, '')

async function get(caminho, parametros) {
  const query = parametros ? `?${new URLSearchParams(parametros)}` : ''
  const resposta = await fetch(`${API_BASE_URL}${caminho}${query}`)
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => ({}))
    throw new Error(corpo.detail ?? `Erro ${resposta.status}`)
  }
  return resposta.json()
}

// ["AC", "AL", ...]
export function buscarUfs() {
  return get('/api/ufs/')
}

// [{ codigo, nome }] em ordem alfabética (catálogo do IBGE, salvo no banco).
export function buscarMunicipiosPorUf(uf) {
  return get(`/api/municipios/${uf}/`)
}

// { latitude, longitude } da cidade (geocodificada uma vez e salva no banco).
export function geocodificarCidade(cidade, uf) {
  return get('/api/localizacao/', { cidade, uf })
}

// Clima atual + previsão de 15 dias (Open-Meteo, via backend).
export function buscarClima({ latitude, longitude }) {
  return get('/api/clima/', { latitude, longitude })
}

// Pontos da costa do RJ usados na previsão marítima.
export function buscarPontosMaritimos() {
  return get('/api/marinha/pontos/')
}

// Previsão marítima completa de um ponto (todos os modelos da Marine API).
export function buscarPrevisaoMaritima(ponto) {
  return get('/api/marinha/', { ponto })
}
