"""Imperium Gzowianskie board game: 3D-printable tokens and buildings (mm, Z up, flat bottoms, no supports). Each function returns one solid."""
import math

from kit import D, U, arc2, box, cbox, circle2, cyl, hull, lathe, poly, prism_x, prism_z


def szyszka(d, h, tiers):
    r, top = d / 2, h - 1.0
    env = lambda z: r * math.sqrt(max(0.0, 1 - (z / (top * 1.04)) ** 2.4))
    pts, prev = [(0, 0), (env(0) * 0.8, 0)], env(0) * 0.8
    for k in range(tiers):
        z0, z1 = top * k / tiers, top * (k + 1) / tiers
        out = env(z0 + (z1 - z0) * 0.3)
        rise = max(out - prev, 0.25)
        pts.append((out, z0 + rise))
        prev = env(z1) * 0.72 if k < tiers - 1 else 1.0
        pts.append((prev, z1))
    pts.append((0, h))
    return lathe(pts, 10)


def drewno():
    f, c = 4.5, 4.5 * math.tan(math.pi / 8)
    octagon = [(-c, 0), (c, 0), (f, f - c), (f, f + c), (c, 2 * f), (-c, 2 * f), (-f, f + c), (-f, f - c)]
    log = prism_x(poly([(y, z) for y, z in octagon]), -11, 11)
    cuts = []
    for s in (-1, 1):
        x0, x1 = (10.55, 11.1) if s > 0 else (-11.1, -10.55)
        cuts.append(D(cyl((x0, 0, f), (x1, 0, f), 3.0), cyl((x0 - .1, 0, f), (x1 + .1, 0, f), 2.2)))
        cuts.append(cyl((x0, 0, f), (x1, 0, f), 0.9))
    for x0, x1, y in ((-8, 1, -1.2), (-3, 8.5, 1.2)):
        cuts.append(box((x0, y - .3, 2 * f - .4), (x1, y + .3, 2 * f + .1)))
    return D(log, cuts)


def piasek():
    big = lathe([(0, 0), (8.2, 0), (8.6, 0.5), (3.0, 7.4), (1.1, 8.3), (0, 8.5)], 7)
    small = lathe([(0, 0), (4.6, 0), (5.0, 0.5), (1.4, 4.4), (0, 4.8)], 6).rotate([0, 0, 25]).translate([6.6, 3.4, 0])
    return U(big, small)


def ryba():
    body = circle2((0, 0), 9.2, 5.2, 28)
    tail = poly([(-7.5, 0), (-14.2, 5.2), (-12.4, 0), (-14.2, -5.2)])
    fin = poly([(-3.5, 4.2), (1.5, 7.4), (3.5, 4.2)])
    belly = poly([(-2.5, -4.4), (0.2, -6.6), (2.2, -4.3)])
    fish = prism_z(body + tail + fin + belly, 0, 4)
    eye = cyl((5.6, 1.4, -1), (5.6, 1.4, 5), 1.15)
    gill = prism_z(arc2((7.6, 0), 5.4, 140, 220, 0.7), 3.45, 4.1)
    scales = [prism_z(arc2((x, y), 2.6, 150, 210, 0.6), 3.5, 4.1) for x, y in ((0.2, 1.6), (0.2, -1.6), (-2.8, 0), (-5.6, 1.5), (-5.6, -1.5))]
    return D(fish, eye, gill, scales)


def roof(w, d, z0, flare, front, back):
    a, b = w / 2, d / 2
    lo = cbox((0, 0, z0 + .01), (w, d, .02))
    mid = cbox((0, 0, z0 + flare), (w + 2 * flare, d + 2 * flare, .02))
    top = [cbox((0, -(b + flare) + .01, z0 + front), (w + 2 * flare, .02, .02)), cbox((0, b + flare - .01, z0 + back), (w + 2 * flare, .02, .02))]
    return hull(lo, mid, top)


def domek():
    w, d, h = 15.0, 12.0, 9.0
    body = cbox((0, 0, h / 2), (w, d, h))
    grooves = [D(cbox((0, 0, z), (w + 1, d + 1, .45)), cbox((0, 0, z), (w - .7, d - .7, 1))) for z in (3.0, 6.0)]
    door = box((-5.0, -d / 2 - .1, -.1), (-1.8, -d / 2 + .6, 6.6))
    window = box((1.6, -d / 2 - .1, 3.4), (5.2, -d / 2 + .6, 6.6))
    side = box((w / 2 - .6, -2, 3.4), (w / 2 + .1, 2, 6.6))
    knob = cyl((-2.5, -d / 2 + .6, 3.3), (-2.5, -d / 2 + .05, 3.3), .45)
    return U(D(body, grooves, door, window, side), knob, roof(w, d, h - .01, 1.1, 3.6, 2.0))


def dom():
    base = cbox((0, 0, 4), (26, 19, 8))
    garage = box((-10.2, -9.6, -.1), (-1.2, -8.9, 5.6))
    lines = [box((-10.2, -9.7, z), (-1.2, -9.25, z + .35)) for z in (1.6, 3.2, 4.8)]
    porch = box((2.6, -9.6, -.1), (5.6, -8.9, 6.2))
    glass = cbox((0, 2.5, 11.6), (22, 13, 7.4))
    mull = [box((x - .25, -4.1, 8.6), (x + .25, -3.55, 14.9)) for x in (-7.3, -3.65, 0, 3.65, 7.3)]
    mull += [box((s * 11.05 - .5, y - .25, 8.6), (s * 11.05 + .5, y + .25, 14.9)) for s in (-1, 1) for y in (-.8, 2.5, 5.8)]
    band = D(cbox((0, 2.5, 8.35), (22.1, 13.1, .5)), cbox((0, 2.5, 8.35), (21.2, 12.2, 1)))
    deck = [box((-12.5, y - .2, 7.7), (12.5, y + .2, 8.1)) for y in (-8.2, -6.9, -5.6)]
    top = roof(22, 13, 15.29, 1.2, 2.2, 2.2).translate([0, 2.5, 0])
    return U(D(base, garage, porch, deck), lines, D(glass, mull, band), top)


def niewypal():
    mound = lathe([(0, 0), (9.2, 0), (9.6, 0.5), (4.6, 4.3), (0, 4.8)], 9)
    p0, p1, p2 = (-1.6, 0, 2.2), (3.0, 0, 12.6), (4.5, 0, 16.0)
    band = U(cyl((0.76, 0, 7.5), (1.2, 0, 8.5), 3.3, 3.8), cyl((1.2, 0, 8.5), (1.86, 0, 10.0), 3.8), cyl((1.86, 0, 10.0), (2.1, 0, 10.55), 3.8, 3.3))
    return U(mound, cyl(p0, p1, 3.3), cyl(p1, p2, 3.3, 1.0), band)


TOKENS = [
    ("Szyszki 1", "szyszka1", lambda: szyszka(12, 13, 4), "#7A4A21", "brązowy"),
    ("Szyszki 5", "szyszka5", lambda: szyszka(16, 17, 5), "#F4F2EC", "biały albo srebrny"),
    ("Szyszki 10", "szyszka10", lambda: szyszka(20, 21, 6), "#F5B301", "żółty albo złoty"),
    ("Drewno", "drewno", drewno, "#8A5A2B", "brązowy"),
    ("Piasek", "piasek", piasek, "#F2D275", "żółty"),
    ("Ryby", "ryby", ryba, "#1F7FD6", "niebieski"),
    ("Domki", "domek", domek, "#3A2620", "ciemny brąz albo czarny"),
    ("Domy", "dom", dom, "#B9B2A6", "szary albo biały"),
    ("Niewypały", "niewypal", niewypal, "#4B5A2A", "zielony albo czarny"),
]
