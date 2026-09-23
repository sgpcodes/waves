from django.db import migrations

# Pontos um pouco afastados da praia (a Marine API não responde em cima da
# areia). Copacabana e Ipanema caem na mesma célula da grade dos modelos,
# por isso viraram um ponto só.
PONTOS = [
    ('copacabana-ipanema', 'Copacabana / Ipanema', -22.990, -43.180, 1),
    ('barra-da-tijuca', 'Barra da Tijuca', -23.020, -43.350, 2),
    ('recreio-prainha', 'Recreio / Prainha', -23.050, -43.500, 3),
    ('niteroi-itacoatiara', 'Niterói (Itacoatiara)', -22.985, -43.030, 4),
    ('marica', 'Maricá', -22.975, -42.820, 5),
]


def criar_pontos(apps, schema_editor):
    PontoMaritimo = apps.get_model('clima', 'PontoMaritimo')
    for slug, nome, latitude, longitude, ordem in PONTOS:
        PontoMaritimo.objects.update_or_create(
            slug=slug,
            defaults={'nome': nome, 'latitude': latitude, 'longitude': longitude, 'ordem': ordem},
        )


def remover_pontos(apps, schema_editor):
    PontoMaritimo = apps.get_model('clima', 'PontoMaritimo')
    PontoMaritimo.objects.filter(slug__in=[p[0] for p in PONTOS]).delete()


class Migration(migrations.Migration):
    dependencies = [('clima', '0002_ponto_maritimo')]

    operations = [migrations.RunPython(criar_pontos, remover_pontos)]
