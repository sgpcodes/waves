import { buscarClimaNoNavegador, buscarVentoNoNavegador } from './openMeteoNavegador'

// Cliente do backend Django (backend/clima). A URL vem de VITE_API_URL
// (.env local ou Environment Variables do Render). Sem ela: no site
// publicado usa o backend do Render; rodando local, o backend da máquina.
const BACKEND_PRODUCAO = 'https://ondas-backend-zs1o.onrender.com'
const BACKEND_LOCAL = 'http://localhost:8010'

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? BACKEND_PRODUCAO : BACKEND_LOCAL)
).replace(/\/$/, '')

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

// Clima atual + previsão de 15 dias (Open-Meteo, via backend). Se o
// backend não conseguir (a Open-Meteo pode recusar o IP compartilhado de
// servidores gratuitos), busca direto pelo navegador — mesmo formato.
export async function buscarClima({ latitude, longitude }) {
  try {
    return await get('/api/clima/', { latitude, longitude })
  } catch {
    return buscarClimaNoNavegador({ latitude, longitude })
  }
}

// Pontos da costa do RJ usados na previsão marítima.
export function buscarPontosMaritimos() {
  return get('/api/marinha/pontos/')
}

// Previsão marítima completa de um ponto (todos os modelos da Marine API).
// O vento vem da API de previsão do tempo; se o backend não conseguiu
// buscar (mesmo motivo do clima), completa pelo navegador.
export async function buscarPrevisaoMaritima(ponto) {
  const previsao = await get('/api/marinha/', { ponto })
  if (!previsao.vento && previsao.ponto) {
    try {
      previsao.vento = await buscarVentoNoNavegador(previsao.ponto)
    } catch {
      // sem vento: a visão intermediária mostra "sem dado de vento"
    }
  }
  return previsao
}
