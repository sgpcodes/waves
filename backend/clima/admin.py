from django.contrib import admin

from .models import Municipio, PontoMaritimo


@admin.register(Municipio)
class MunicipioAdmin(admin.ModelAdmin):
    list_display = ('nome', 'uf', 'codigo_ibge', 'latitude', 'longitude', 'atualizado_em')
    list_filter = ('uf',)
    search_fields = ('nome', 'codigo_ibge')


@admin.register(PontoMaritimo)
class PontoMaritimoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'regiao', 'slug', 'latitude', 'longitude', 'orientacao', 'ordem', 'ativo')
    list_editable = ('orientacao', 'ordem', 'ativo')
    list_filter = ('regiao', 'ativo')
