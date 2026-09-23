import requests

from django.core.cache import cache

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from . import marinha, servicos
from .models import Municipio, PontoMaritimo

CACHE_TTL_CLIMA = 60 * 10  # 10 min: o front pede a cada 1 min, a API muda bem mais devagar.

ERRO_PROVEDOR = {'detail': 'Serviço de clima indisponível no momento. Tente de novo em instantes.'}


def _uf_valida(uf):
    uf = (uf or '').strip().upper()
    return uf if uf in servicos.UFS else None


class UfsView(APIView):
    """GET /api/ufs/ -> as 27 siglas, pro seletor de estado."""

    def get(self, request):
        return Response(servicos.UFS)


class MunicipiosView(APIView):
    """GET /api/municipios/<uf>/ -> [{codigo, nome}] em ordem alfabética.

    Na primeira vez que um estado é pedido, busca no IBGE e salva no banco;
    depois disso responde só do banco."""

    def get(self, request, uf):
        uf = _uf_valida(uf)
        if not uf:
            return Response({'detail': 'UF inválida.'}, status=status.HTTP_400_BAD_REQUEST)

        municipios = list(Municipio.objects.filter(uf=uf).values('codigo_ibge', 'nome'))
        if not municipios:
            try:
                do_ibge = servicos.buscar_municipios_ibge(uf)
            except requests.RequestException:
                return Response(ERRO_PROVEDOR, status=status.HTTP_502_BAD_GATEWAY)
            Municipio.objects.bulk_create(
                [Municipio(codigo_ibge=item['codigo'], nome=item['nome'], uf=uf) for item in do_ibge],
                ignore_conflicts=True,
            )
            municipios = [{'codigo_ibge': item['codigo'], 'nome': item['nome']} for item in do_ibge]

        municipios.sort(key=lambda item: servicos.normalizar_texto(item['nome']))
        return Response([{'codigo': item['codigo_ibge'], 'nome': item['nome']} for item in municipios])


class LocalizacaoView(APIView):
    """GET /api/localizacao/?uf=RJ&cidade=Maricá -> {latitude, longitude}.

    O IBGE não dá coordenada, então a cidade é geocodificada (Open-Meteo)
    uma única vez e a coordenada fica salva no município."""

    def get(self, request):
        uf = _uf_valida(request.query_params.get('uf'))
        cidade = (request.query_params.get('cidade') or '').strip()
        if not uf or not cidade:
            return Response({'detail': 'Informe "uf" e "cidade".'}, status=status.HTTP_400_BAD_REQUEST)

        municipio = Municipio.objects.filter(uf=uf, nome=cidade).first()
        if municipio and municipio.latitude is not None:
            return Response({'latitude': municipio.latitude, 'longitude': municipio.longitude})

        try:
            coordenadas = servicos.geocodificar_cidade(cidade, uf)
        except requests.RequestException:
            return Response(ERRO_PROVEDOR, status=status.HTTP_502_BAD_GATEWAY)
        if coordenadas is None:
            return Response({'detail': 'Cidade não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        latitude, longitude = coordenadas
        if municipio:
            municipio.latitude = latitude
            municipio.longitude = longitude
            municipio.save(update_fields=['latitude', 'longitude', 'atualizado_em'])
        return Response({'latitude': latitude, 'longitude': longitude})


class ClimaView(APIView):
    """GET /api/clima/?latitude=-22.9194&longitude=-42.8186

    Clima atual + previsão de 15 dias (Open-Meteo), já no formato da
    Dashboard. Cacheado por coordenada."""

    def get(self, request):
        try:
            latitude = round(float(request.query_params.get('latitude')), 4)
            longitude = round(float(request.query_params.get('longitude')), 4)
        except (TypeError, ValueError):
            return Response({'detail': 'Informe "latitude" e "longitude".'}, status=status.HTTP_400_BAD_REQUEST)
        if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
            return Response({'detail': 'Coordenada fora do intervalo.'}, status=status.HTTP_400_BAD_REQUEST)

        cache_key = f'clima:{latitude}:{longitude}'
        clima = cache.get(cache_key)
        if clima is None:
            try:
                clima = servicos.buscar_clima(latitude, longitude)
            except requests.RequestException:
                return Response(ERRO_PROVEDOR, status=status.HTTP_502_BAD_GATEWAY)
            cache.set(cache_key, clima, CACHE_TTL_CLIMA)

        return Response(clima)


CACHE_TTL_MARINHA = 60 * 30  # 30 min: os modelos de onda atualizam de 6 em 6 h no mínimo.


class PontosMaritimosView(APIView):
    """GET /api/marinha/pontos/ -> [{slug, nome, regiao, regiaoNome, latitude, longitude}]"""

    def get(self, request):
        nomes_regiao = dict(PontoMaritimo.REGIOES)
        pontos = PontoMaritimo.objects.filter(ativo=True).values('slug', 'nome', 'regiao', 'latitude', 'longitude')
        return Response([{**p, 'regiaoNome': nomes_regiao.get(p['regiao'], p['regiao'])} for p in pontos])


class PrevisaoMaritimaView(APIView):
    """GET /api/marinha/?ponto=copacabana-ipanema

    Previsão marítima completa do ponto (Open-Meteo Marine): agora, diária,
    hora a hora por modelo, nível do mar/correntes a cada 15 min e o
    histórico ERA5. Sem "ponto", usa o primeiro ponto ativo."""

    def get(self, request):
        slug = request.query_params.get('ponto')
        pontos = PontoMaritimo.objects.filter(ativo=True)
        ponto = pontos.filter(slug=slug).first() if slug else pontos.first()
        if ponto is None:
            return Response({'detail': 'Ponto não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        cache_key = f'marinha:{ponto.slug}:{ponto.latitude}:{ponto.longitude}'
        previsao = cache.get(cache_key)
        if previsao is None:
            try:
                previsao = marinha.buscar_previsao_maritima(ponto.latitude, ponto.longitude)
            except requests.RequestException:
                return Response(ERRO_PROVEDOR, status=status.HTTP_502_BAD_GATEWAY)
            # Se só o vento falhou, guarda por pouco tempo pra tentar de novo logo.
            ttl = CACHE_TTL_MARINHA if previsao.get('vento') else 60
            cache.set(cache_key, previsao, ttl)

        return Response({
            'ponto': {
                'slug': ponto.slug,
                'nome': ponto.nome,
                'latitude': ponto.latitude,
                'longitude': ponto.longitude,
                'orientacao': ponto.orientacao,
            },
            **previsao,
        })
