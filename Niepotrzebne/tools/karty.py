#!/usr/bin/env python3
"""Imperium Gzowianskie: copy card photos from the Gzowo Dataset into assets/karty/ at 480 px."""
import os
from PIL import Image, ImageOps

D = '/Users/jurek/Downloads/Claude/Projects/Gzowo Dataset/media'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'karty')
G, A = 'miniatury/galeria/', 'miniatury/archiwum/'
MAP = {
    'lody': G + 'IMG_4503_ciezka-droga-do-stacji-moya.jpg', 'sniadanie': 'klatki/dom-wnetrze_2026-07-28/15_0093s.jpg', 'kopanie': G + 'IMG_2850_nad-woda.jpg',
    'obiad': G + 'IMG_6684_zimowy-obiad-jurka.jpg', 'hamak': G + 'IMG_1458_clu-na-hamaku.jpg', 'kajak': 'miniatury/plaza/IMG_1145.jpg', 'sup': G + 'IMG_1997_rysio-na-desce-sup.jpg',
    'dron': G + 'IMG_4299_dron-w-chmurach.jpg', 'ognisko': G + 'IMG_3663_malowanie-swiatlem.jpg', 'ptaki': G + 'IMG_8221_klucz-ptakow.jpg', 'grad': G + 'IMG_8213_zimowe-chodzenie-po-lodzie.jpg',
    'hossa': G + 'IMG_9197_slonce-nad-polem.jpg', 'krach': G + 'IMG_6746_zimowy-obiad-rysia.jpg', 'mapa': A + '2021-05-17_mapa-geodezyjna-dzialki.jpg', 'waldek': G + 'IMG_7546_dziadkowie.jpg',
    'major': 'miniatury/plaza/IMG_1157.jpg', 'wojt': 'geo/ortofoto-dzialka-zblizenie.jpg', 'saperzy': 'klatki/dom-z-zewnatrz_2026-07-28/01_0000s.jpg', 'beethoven': G + 'IMG_4288_kontemplujacy-beethoven.jpg',
    'dropsik': G + 'IMG_3748_jurek-z-dropsikiem.jpg', 'koza': A + 'bez-daty_jan-sukiennik-z-koza-nad-narwia.jpg', 'benny': G + 'IMG_8933_luna.jpg', 'noc': 'klatki/2023-07-08_czerwona-postac-nad-narwia/09_0044s.jpg',
    'zofia': 'klatki/2023-07-08_czerwona-postac-nad-narwia/04_0018s.jpg', 'helikopter': A + '2022-09-06_waldek-pozuje-z-helikopterem.jpg', 'osmiornica': A + '2023-06-07_logo-gzowo-34.jpg',
    'tablica': A + '2021-10-23_stara-tablica-osrodka-fso.jpg', 'daje': G + 'IMG_4297_pilot-jan.jpg', 'orange': G + 'IMG-20251129-WA0001_the-orange-beauty-w-pelnej-okazalosci.jpg',
}
os.makedirs(OUT, exist_ok=True)
for cid, rel in MAP.items():
    im = ImageOps.exif_transpose(Image.open(os.path.join(D, rel))).convert('RGB')
    im.thumbnail((480, 480))
    im.save(os.path.join(OUT, cid + '.jpg'), 'JPEG', quality=78, optimize=True)
print(len(MAP), 'cards')
