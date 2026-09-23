from django.db import models


class Municipio(models.Model):
    """Catálogo de municípios do IBGE + coordenada resolvida pelo geocoding.

    Fica salvo no banco (Supabase) pra não depender do IBGE/geocoding a
    cada troca de cidade: a lista de um estado é buscada no IBGE só na
    primeira vez, e a coordenada de uma cidade só é geocodificada uma vez.
    """

    codigo_ibge = models.CharField(max_length=7, primary_key=True)
    nome = models.CharField(max_length=120)
    uf = models.CharField(max_length=2, db_index=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['uf', 'nome']
        verbose_name = 'município'
        verbose_name_plural = 'municípios'

    def __str__(self):
        return f'{self.nome}/{self.uf}'


class PontoMaritimo(models.Model):
    """Ponto no mar (um pouco afastado da praia) usado na previsão marítima.

    A Marine API só responde pra coordenada no mar — em cima da areia vem
    tudo vazio. Os pontos do RJ são criados pela migration 0003; dá pra
    adicionar/editar outros pelo /admin/.
    """

    REGIOES = [
        ('costa-verde', 'Costa Verde'),
        ('rio', 'Rio de Janeiro (capital)'),
        ('niteroi-marica', 'Niterói e Maricá'),
        ('lagos', 'Região dos Lagos'),
        ('norte', 'Norte Fluminense'),
    ]

    slug = models.SlugField(max_length=60, primary_key=True)
    nome = models.CharField(max_length=80)
    regiao = models.CharField(max_length=20, choices=REGIOES, default='rio')
    latitude = models.FloatField()
    longitude = models.FloatField()
    # Pra onde a praia "olha" (direção do mar, em graus: 90 = leste, 180 =
    # sul). Serve pra dizer se o vento é terral (sopra da terra pro mar,
    # bom pro surfe) ou maral. Valores aproximados — ajuste no /admin/.
    orientacao = models.PositiveSmallIntegerField(null=True, blank=True)
    ordem = models.PositiveSmallIntegerField(default=0)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ['ordem', 'nome']
        verbose_name = 'ponto marítimo'
        verbose_name_plural = 'pontos marítimos'

    def __str__(self):
        return self.nome
