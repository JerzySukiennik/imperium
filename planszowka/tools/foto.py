#!/usr/bin/env python3
"""Imperium Gzowianskie board game: crop card photos from the Gzowo Dataset to the printed card window (57 x 46 mm) at print resolution."""
import os
import sys
from PIL import Image, ImageOps

D = '/Users/jurek/Downloads/Claude/Projects/Gzowo Dataset/media'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'foto')
G, A, P = 'photos/galeria/', 'photos/archiwum/', 'photos/plaza/'
W, H = 1026, 828
MAP = {
    'lody': (G + 'IMG_4503_ciezka-droga-do-stacji-moya.jpg', .5), 'sniadanie': ('klatki/dom-wnetrze_2026-07-28/15_0093s.jpg', .5), 'kopanie': (G + 'IMG_2850_nad-woda.jpg', .5),
    'obiad': (G + 'IMG_6684_zimowy-obiad-jurka.jpg', .4), 'hamak': (G + 'IMG_1458_clu-na-hamaku.jpg', .5), 'kajak': (P + 'IMG_1145.jpg', .5), 'sup': (G + 'IMG_1997_rysio-na-desce-sup.jpg', .5),
    'dron': (G + 'IMG_4299_dron-w-chmurach.jpg', .5), 'ognisko': (G + 'IMG_3663_malowanie-swiatlem.jpg', .5), 'ptaki': (G + 'IMG_8221_klucz-ptakow.jpg', .4), 'grad': (G + 'IMG_8213_zimowe-chodzenie-po-lodzie.jpg', .5),
    'motorowka': (G + 'IMG_2110_motorowka-rysio.jpg', .5), 'taras': (G + 'IMG_9191_praca-nad-tarasem.jpg', .5), 'mapa': (A + '2021-05-17_mapa-geodezyjna-dzialki.jpg', .5), 'waldek': (G + 'IMG_7546_dziadkowie.jpg', .4),
    'major': (P + 'IMG_1157.jpg', .5), 'wojt': ('geo/ortofoto-dzialka-zblizenie.jpg', .5), 'saperzy': ('klatki/dom-z-zewnatrz_2026-07-28/01_0000s.jpg', .5), 'beethoven': (G + 'IMG_4288_kontemplujacy-beethoven.jpg', .5),
    'dropsik': (G + 'IMG_3748_jurek-z-dropsikiem.jpg', .5), 'koza': (A + 'bez-daty_jan-sukiennik-z-koza-nad-narwia.jpg', .4), 'benny': (G + 'IMG_8933_luna.jpg', .5), 'noc': ('klatki/2023-07-08_czerwona-postac-nad-narwia/09_0044s.jpg', .5),
    'zofia': ('klatki/2023-07-08_czerwona-postac-nad-narwia/04_0018s.jpg', .5), 'helikopter': (A + '2022-09-06_waldek-pozuje-z-helikopterem.jpg', .5), 'osmiornica': (A + '2023-06-07_logo-gzowo-34.jpg', .5),
    'tablica': (A + '2021-10-23_stara-tablica-osrodka-fso.jpg', .5), 'daje': (G + 'IMG_4297_pilot-jan.jpg', .4), 'orange': (G + 'IMG-20251129-WA0001_the-orange-beauty-w-pelnej-okazalosci.jpg', .5),
}
os.makedirs(OUT, exist_ok=True)
small = []
for cid, (rel, bias) in MAP.items():
    im = ImageOps.exif_transpose(Image.open(os.path.join(D, rel))).convert('RGB')
    if im.width < W * .6:
        small.append((cid, im.size))
    ImageOps.fit(im, (W, H), Image.LANCZOS, centering=(.5, bias)).save(os.path.join(OUT, cid + '.jpg'), 'JPEG', quality=88, optimize=True)
print(len(MAP), 'photos', 'low-res:', small)
if len(sys.argv) > 1:
    ids = list(MAP)
    cols, cw, ch = 6, 342, 276
    sheet = Image.new('RGB', (cols * cw, ((len(ids) + cols - 1) // cols) * ch), 'white')
    for i, cid in enumerate(ids):
        sheet.paste(Image.open(os.path.join(OUT, cid + '.jpg')).resize((cw - 6, ch - 6)), ((i % cols) * cw + 3, (i // cols) * ch + 3))
    sheet.save(sys.argv[1], quality=85)
