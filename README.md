# Ondas — Dashboard de clima

Cópia da parte da Dashboard do projeto [API_Django_LoRa](https://github.com/sgpcodes/API_Django_LoRa) que inclui:

- **Cabeçalho**: seletores de cidade e UF (catálogo do IBGE), status Online/Offline, coordenadas e mapa (Leaflet + OpenStreetMap) com botão de expandir.
- **Previsão do tempo**: 15 dias. Ao clicar num dia, abre a previsão por turno (manhã, tarde e noite).
- **Painel "Hoje"**: temperatura mín./máx., ponto de orvalho, índice UV, precipitação, visibilidade, nascer e pôr do sol, e a condição atual.

Abaixo disso fica a **previsão marítima do litoral do Rio de Janeiro** (Open-Meteo Marine API):
- Três abas com os mesmos dados, uma pra cada nível de conhecimento:
  - **Técnica:** todos os números e modelos.
  - **Intermediária:** no estilo Surfguru. Tem uma grade de 3 em 3 horas (onda, período, direção, swell 2, vento, rajada, terral/maral, maré), gráficos de ondas, vento e maré, e um resumo por dia. O vento vem da Forecast API da Open-Meteo. Terral e maral dependem de `orientacao`, pra onde a praia está virada, que é editável no `/admin/`. As regras ficam em `frontend/src/services/marinhaIntermediaria.js`.
  - **Simples:** pra leigos. Diz se o mar está calmo, moderado, agitado ou perigoso, compara a onda com uma pessoa, mostra o que dá pra fazer (banho, surfe, stand-up, barco), a maré e os próximos 7 dias. As regras ficam em `frontend/src/services/marinhaSimples.js`.
- **21 pontos do litoral do RJ**, de Paraty à divisa com o ES, em 5 regiões: Costa Verde, capital, Niterói e Maricá, Região dos Lagos e Norte Fluminense. Ficam salvos no banco (migrations `0003` e `0005`) e dá pra adicionar ou editar em `/admin/`. Praias a menos de ~8 km uma da outra caem no mesmo quadrado do modelo, por isso algumas estão juntas.
- **Agora no mar:** as 23 variáveis atuais (ondas, swell 1/2/3, onda de vento, temperatura da água, corrente, nível do mar e barômetro inverso).
- **Próximos 16 dias:** as 11 variáveis diárias. Até ~10 dias vêm do modelo padrão e o resto é completado pelo GFS ou ECMWF.
- **Maré e correntes** a cada 15 min, com preamar e baixa-mar calculadas.
- **Comparação entre modelos** hora a hora: MeteoFrance Wave e Currents, ECMWF WAM e WAM 0,25°, GFS Wave 0,25° e DWD GWAM.
- **Tabela hora a hora** com todas as variáveis de cada modelo.
- **Histórico ERA5** dos últimos ~90 dias.
- **Gráfico de energia das ondas** (abas Técnica e Intermediária), no estilo dos sites de surfe: a altura da barra é a energia em **J/m²** (ρ·g·H²/16), e a cor é a **potência em kW/m** (ρ·g²·H²·T/64π). Tem abas por componente: Total, Vagas e cada swell, nomeado pela direção de onde vem. A API não fornece esses dados, então o backend calcula (`energia_onda` e `potencia_onda` em `backend/clima/marinha.py`).
- Ficam de fora os modelos sem cobertura no RJ: DWD EWAM (só Europa) e GFS Wave 0,16° (só hemisfério norte).

```
ondas/
├── backend/    Django + DRF  → Render (web service), banco no Supabase
├── frontend/   React + Vite  → Render (static site)
└── render.yaml Blueprint que cria os dois serviços no Render
```

## APIs externas (todas gratuitas e sem chave)

| API | Para quê | Chamada em |
|---|---|---|
| IBGE Localidades | lista de municípios por UF | `backend/clima/servicos.py` |
| Open-Meteo Geocoding | cidade + UF → latitude/longitude | `backend/clima/servicos.py` |
| Open-Meteo Forecast | clima atual e previsão de 15 dias | `backend/clima/servicos.py` |
| Open-Meteo Marine | ondas, swell, maré, correntes, temperatura da água (todos os modelos) | `backend/clima/marinha.py` |
| OpenStreetMap tiles | mapa | `frontend/src/components/EstacaoCabecalho.jsx` |

## Endpoints do backend

| Método | Rota | Retorno |
|---|---|---|
| GET | `/api/ufs/` | `["AC", "AL", ...]` |
| GET | `/api/municipios/<UF>/` | `[{codigo, nome}]`. Na primeira vez busca no IBGE e salva no banco. |
| GET | `/api/localizacao/?uf=RJ&cidade=Maricá` | `{latitude, longitude}`. Geocodifica uma vez e salva no município. |
| GET | `/api/clima/?latitude=..&longitude=..` | clima atual + `previsaoDiaria` + `previsaoHoraria` (cache de 10 min) |
| GET | `/api/marinha/pontos/` | `[{slug, nome, regiao, regiaoNome, latitude, longitude}]` |
| GET | `/api/marinha/?ponto=copacabana-ipanema` | previsão marítima completa: `atual`, `diaria`, `horaria` (por modelo), `quinzeMinutos`, `historico` (ERA5), `modelos` e `unidades`. Cache de 30 min. |
| GET | `/` | health check |

Tabelas no banco: `clima_municipio` (código IBGE, nome, UF, latitude, longitude) e `clima_pontomaritimo` (pontos da costa, criados pelas migrations `0003` e `0005`).

## Rodar localmente

```bash
# backend (sem DATABASE_URL usa SQLite)
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver 8010     # http://localhost:8010

# frontend (em outro terminal)
cd frontend
cp .env.example .env                # VITE_API_URL=http://localhost:8010
npm install
npm run dev                         # http://localhost:5180
```

## Deploy

### 1. Supabase (banco)
1. Crie um projeto no Supabase e guarde a senha do banco.
2. Clique em **Connect** e copie a URI do **Session pooler** (porta **5432**):
   `postgresql://postgres.XXXX:SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`
   Não use a "Direct connection": ela só funciona por IPv6, e o Render não tem IPv6.
3. Não precisa criar tabela. O `migrate` do deploy cria tudo.

### 2. Render (backend + frontend)
1. Suba esta pasta para um repositório no GitHub.
2. No Render, vá em **New → Blueprint** e escolha o repositório. O `render.yaml` cria o `ondas-backend` e o `ondas-frontend`.
3. Preencha as variáveis que o Render pedir:
   - `ondas-backend` → `DATABASE_URL` = URI do Supabase (passo 1).
   - `ondas-backend` → `CORS_ALLOWED_ORIGINS` = URL do frontend (ex.: `https://ondas-frontend.onrender.com`).
   - `ondas-frontend` → `VITE_API_URL` = URL do backend (ex.: `https://ondas-backend.onrender.com`).
4. Se você mudar `VITE_API_URL` depois, rode um **Manual Deploy** do frontend: o Vite grava essa URL no momento do build.

O plano gratuito do Render "dorme" depois de 15 min sem uso. Por isso, a primeira abertura pode demorar uns 30 a 50 segundos.

### Admin (opcional)
Para ver os municípios salvos em `/admin/`, crie um usuário pelo Shell do serviço no Render:
`python manage.py createsuperuser`
