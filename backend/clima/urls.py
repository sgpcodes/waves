from django.urls import path

from .views import (
    ClimaView,
    LocalizacaoView,
    MunicipiosView,
    PontosMaritimosView,
    PrevisaoMaritimaView,
    UfsView,
)

urlpatterns = [
    # GET /api/ufs/ -> ["AC", "AL", ...]
    path('ufs/', UfsView.as_view(), name='ufs'),
    # GET /api/municipios/RJ/ -> [{codigo, nome}, ...]
    path('municipios/<str:uf>/', MunicipiosView.as_view(), name='municipios'),
    # GET /api/localizacao/?uf=RJ&cidade=Maricá -> {latitude, longitude}
    path('localizacao/', LocalizacaoView.as_view(), name='localizacao'),
    # GET /api/clima/?latitude=..&longitude=.. -> clima atual + previsão de 15 dias
    path('clima/', ClimaView.as_view(), name='clima'),
    # GET /api/marinha/pontos/ -> pontos da costa do RJ
    path('marinha/pontos/', PontosMaritimosView.as_view(), name='marinha-pontos'),
    # GET /api/marinha/?ponto=<slug> -> previsão marítima completa (todos os modelos)
    path('marinha/', PrevisaoMaritimaView.as_view(), name='marinha'),
]
