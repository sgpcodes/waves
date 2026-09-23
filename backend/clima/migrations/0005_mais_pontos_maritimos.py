from django.db import migrations

# Litoral do RJ inteiro, de Paraty à divisa com o ES. Cada ponto fica um
# pouco afastado da praia e numa célula diferente do modelo (~8 km) —
# testado um por um. Grumari cai na mesma célula de Recreio/Prainha.
PONTOS = [
    # slug, nome, região, latitude, longitude, ordem
    ('trindade', 'Trindade (Paraty)', 'costa-verde', -23.370, -44.720, 10),
    ('paraty', 'Paraty', 'costa-verde', -23.200, -44.620, 11),
    ('angra-dos-reis', 'Angra dos Reis', 'costa-verde', -23.060, -44.300, 12),
    ('ilha-grande', 'Ilha Grande (Lopes Mendes)', 'costa-verde', -23.190, -44.100, 13),
    ('mangaratiba', 'Mangaratiba', 'costa-verde', -23.000, -44.050, 14),
    ('marambaia', 'Restinga da Marambaia', 'costa-verde', -23.100, -43.850, 15),
    ('recreio-prainha', 'Recreio / Prainha / Grumari', 'rio', -23.050, -43.500, 20),
    ('barra-da-tijuca', 'Barra da Tijuca', 'rio', -23.020, -43.350, 21),
    ('sao-conrado', 'São Conrado', 'rio', -23.010, -43.270, 22),
    ('copacabana-ipanema', 'Copacabana / Ipanema', 'rio', -22.990, -43.180, 23),
    ('niteroi-itacoatiara', 'Niterói (Itacoatiara)', 'niteroi-marica', -22.985, -43.030, 30),
    ('marica', 'Maricá', 'niteroi-marica', -22.975, -42.820, 31),
    ('saquarema', 'Saquarema', 'lagos', -22.940, -42.490, 40),
    ('praia-seca', 'Praia Seca (Araruama)', 'lagos', -22.960, -42.300, 41),
    ('arraial-do-cabo', 'Arraial do Cabo', 'lagos', -22.990, -42.020, 42),
    ('cabo-frio', 'Cabo Frio (Praia do Forte)', 'lagos', -22.900, -41.990, 43),
    ('buzios', 'Búzios', 'lagos', -22.750, -41.870, 44),
    ('rio-das-ostras', 'Rio das Ostras', 'norte', -22.540, -41.920, 50),
    ('macae', 'Macaé', 'norte', -22.400, -41.750, 51),
    ('farol-de-sao-tome', 'Farol de São Tomé', 'norte', -22.050, -40.980, 52),
    ('atafona', 'Atafona (São João da Barra)', 'norte', -21.630, -41.000, 53),
]


def criar_pontos(apps, schema_editor):
    PontoMaritimo = apps.get_model('clima', 'PontoMaritimo')
    for slug, nome, regiao, latitude, longitude, ordem in PONTOS:
        PontoMaritimo.objects.update_or_create(
            slug=slug,
            defaults={'nome': nome, 'regiao': regiao, 'latitude': latitude, 'longitude': longitude, 'ordem': ordem},
        )


def nada(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [('clima', '0004_ponto_maritimo_regiao')]

    operations = [migrations.RunPython(criar_pontos, nada)]
