from django.db import migrations

# Pra onde cada praia está virada (direção do mar, em graus). Aproximado a
# partir do mapa — dá pra refinar pelo /admin/.
ORIENTACOES = {
    'trindade': 120,
    'paraty': 90,
    'angra-dos-reis': 180,
    'ilha-grande': 120,
    'mangaratiba': 180,
    'marambaia': 180,
    'recreio-prainha': 170,
    'barra-da-tijuca': 165,
    'sao-conrado': 180,
    'copacabana-ipanema': 150,
    'niteroi-itacoatiara': 170,
    'marica': 165,
    'saquarema': 160,
    'praia-seca': 170,
    'arraial-do-cabo': 200,
    'cabo-frio': 120,
    'buzios': 160,
    'rio-das-ostras': 120,
    'macae': 130,
    'farol-de-sao-tome': 110,
    'atafona': 70,
}


def definir(apps, schema_editor):
    PontoMaritimo = apps.get_model('clima', 'PontoMaritimo')
    for slug, graus in ORIENTACOES.items():
        PontoMaritimo.objects.filter(slug=slug).update(orientacao=graus)


def nada(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [('clima', '0006_ponto_maritimo_orientacao')]

    operations = [migrations.RunPython(definir, nada)]
