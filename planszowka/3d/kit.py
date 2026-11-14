"""Pionki kit: manifold3d primitives, coloured parts and printability checks (units: mm, Z up, front = -Y)."""
import math

import numpy as np
from manifold3d import CrossSection, JoinType, Manifold, Mesh, OpType

STYLE = {"faceted": False}
BASE_H = 3.0

PALETTE = {
    "black": (0.035, 0.035, 0.04),
    "white": (0.9, 0.89, 0.86),
    "skin": (0.87, 0.6, 0.42),
    "brown": (0.3, 0.15, 0.07),
    "hazel": (0.52, 0.31, 0.15),
    "green": (0.13, 0.5, 0.16),
    "red": (0.72, 0.04, 0.05),
    "blue": (0.06, 0.2, 0.62),
    "navy": (0.03, 0.06, 0.22),
    "blond": (0.93, 0.76, 0.36),
    "denim": (0.05, 0.1, 0.33),
    "tan": (0.66, 0.36, 0.14),
    "yellow": (0.95, 0.62, 0.02),
    "grey": (0.45, 0.47, 0.5),
    "graphite": (0.1, 0.105, 0.115),
    "orange": (0.95, 0.33, 0.03),
    "purple": (0.36, 0.14, 0.6),
}


def flat(items):
    for it in items:
        if isinstance(it, (list, tuple)):
            yield from flat(it)
        elif it is not None:
            yield it


def segs(r):
    if STYLE["faceted"]:
        return 8 if r < 2.2 else 12 if r < 7 else 16
    return int(min(96, max(20, round(r * 9 + 14))) // 4 * 4)


def U(*ms):
    ms = [m for m in flat(ms) if not m.is_empty()]
    if not ms:
        return Manifold()
    return ms[0] if len(ms) == 1 else Manifold.batch_boolean(ms, OpType.Add)


def D(a, *bs):
    b = U(*bs)
    return a if b.is_empty() else a - b


def hull(*ms):
    return Manifold.batch_hull(list(flat(ms)))


def ell(c, r, rot=None):
    rx, ry, rz = (r, r, r) if np.isscalar(r) else r
    m = Manifold.sphere(1.0, segs(max(rx, ry, rz))).scale([rx, ry, rz])
    if rot is not None:
        m = m.rotate(list(rot))
    return m.translate(list(c))


def cap(p0, p1, r0, r1=None):
    return hull(ell(p0, r0), ell(p1, r0 if r1 is None else r1))


def box(lo, hi):
    return Manifold.cube([hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]]).translate(list(lo))


def cbox(c, s):
    return Manifold.cube(list(s), True).translate(list(c))


def rbox(c, s, r):
    h = [max(v / 2 - r, 1e-3) for v in s]
    return hull([ell((c[0] + i * h[0], c[1] + j * h[1], c[2] + k * h[2]), r)
                 for i in (-1, 1) for j in (-1, 1) for k in (-1, 1)])


def frame(p0, p1):
    d = np.subtract(p1, p0).astype(float)
    length = float(np.linalg.norm(d))
    z = d / length
    a = np.array([1.0, 0, 0]) if abs(z[0]) < 0.9 else np.array([0, 1.0, 0])
    x = np.cross(a, z)
    x /= np.linalg.norm(x)
    y = np.cross(z, x)
    return np.column_stack([x, y, z, np.asarray(p0, float)]), length


def cyl(p0, p1, r0, r1=None):
    m, length = frame(p0, p1)
    r1 = r0 if r1 is None else r1
    return Manifold.cylinder(length, r0, r1, segs(max(r0, r1))).transform(m)


def disc(c, rx, ry, h=0.02):
    return Manifold.cylinder(h, 1, 1, segs(max(rx, ry))).scale([rx, ry, 1]).translate(list(c))


def half(normal, offset, size=200.0):
    m, _ = frame((0, 0, 0), normal)
    n = np.asarray(normal, float)
    n /= np.linalg.norm(n)
    return Manifold.cube([size, size, size]).translate([-size / 2, -size / 2, 0]).transform(m).translate(list(n * offset))


def above(z):
    return half((0, 0, 1), z)


def poly(points):
    p = np.asarray(points, float)
    area = 0.5 * float(np.sum(p[:, 0] * np.roll(p[:, 1], -1) - np.roll(p[:, 0], -1) * p[:, 1]))
    return CrossSection([p if area > 0 else p[::-1]])


def circle2(c, r, ry=None, n=None):
    return CrossSection.circle(1.0, n or max(16, segs(max(r, ry or r)))).scale([r, r if ry is None else ry]).translate(list(c))


def rrect2(c, w, h, r):
    r = min(r, w / 2 - 1e-3, h / 2 - 1e-3)
    return CrossSection.square([w - 2 * r, h - 2 * r], True).offset(r, JoinType.Round, 2.0, 24).translate(list(c))


def arc2(c, r, a0, a1, w, n=24):
    ang = np.radians(np.linspace(a0, a1, n))
    outer = np.column_stack([c[0] + (r + w / 2) * np.cos(ang), c[1] + (r + w / 2) * np.sin(ang)])
    inner = np.column_stack([c[0] + (r - w / 2) * np.cos(ang), c[1] + (r - w / 2) * np.sin(ang)])[::-1]
    body = poly(np.vstack([outer, inner]))
    ends = [circle2((c[0] + r * math.cos(a), c[1] + r * math.sin(a)), w / 2, n=12) for a in (ang[0], ang[-1])]
    return body + ends[0] + ends[1]


def line2(p0, p1, w):
    return CrossSection.batch_hull([circle2(p0, w / 2, n=12), circle2(p1, w / 2, n=12)])


TZ = np.array([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]], float)
TY = np.array([[1, 0, 0, 0], [0, 0, -1, 0], [0, 1, 0, 0]], float)
TX = np.array([[0, 0, 1, 0], [1, 0, 0, 0], [0, 1, 0, 0]], float)


def prism_z(shape, z0, z1):
    shape = shape if isinstance(shape, CrossSection) else poly(shape)
    return shape.extrude(z1 - z0).translate([0, 0, z0])


def prism_y(shape, y0, y1):
    shape = shape if isinstance(shape, CrossSection) else poly(shape)
    return shape.extrude(y1 - y0).transform(TY).translate([0, y1, 0])


def prism_x(shape, x0, x1):
    shape = shape if isinstance(shape, CrossSection) else poly(shape)
    return shape.extrude(x1 - x0).transform(TX).translate([x0, 0, 0])


def lathe(profile, n=None):
    return poly(profile).revolve(n or segs(max(p[0] for p in profile)))


def loft(rings):
    rings = [np.asarray(r, float) for r in rings]
    n, k = len(rings[0]), len(rings)
    verts = np.vstack(rings + [rings[0].mean(0)[None], rings[-1].mean(0)[None]])
    tris = []
    for i in range(k - 1):
        a, b = i * n, (i + 1) * n
        for j in range(n):
            j2 = (j + 1) % n
            tris += [(a + j, b + j, a + j2), (a + j2, b + j, b + j2)]
    c0, c1, last = k * n, k * n + 1, (k - 1) * n
    for j in range(n):
        j2 = (j + 1) % n
        tris += [(c0, j, j2), (c1, last + j2, last + j)]
    tris = np.asarray(tris, np.uint32)
    m = Manifold(Mesh(vert_properties=np.asarray(verts, np.float32), tri_verts=tris))
    if m.volume() < 0:
        m = Manifold(Mesh(vert_properties=np.asarray(verts, np.float32), tri_verts=tris[:, ::-1].copy()))
    return m


def ring(c, rx, ry, r, n=22, r_fn=None, tilt=0.0):
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        pts.append((c[0] + rx * math.cos(a), c[1] + ry * math.sin(a), c[2] + tilt * math.sin(a)))
    return U([cap(pts[i], pts[(i + 1) % n], r if r_fn is None else r_fn(i)) for i in range(n)])


def drop(m, v):
    return hull(m, m.translate(list(v)))


def base_round(d=25.0, h=BASE_H):
    r = d / 2
    return lathe([(0, 0), (r - 0.5, 0), (r, 0.5), (r, h - 0.8), (r - 0.8, h), (0, h)], 96 if not STYLE["faceted"] else 24)


def base_slab(shape, h=BASE_H):
    shape = shape if isinstance(shape, CrossSection) else poly(shape)
    lo = shape.offset(-0.5, JoinType.Round, 2.0, 48)
    hi = shape.offset(-0.8, JoinType.Round, 2.0, 48)
    return U(hull(lo.extrude(0.02), shape.extrude(0.02).translate([0, 0, 0.5])),
             shape.extrude(h - 1.3).translate([0, 0, 0.5]),
             hull(shape.extrude(0.02).translate([0, 0, h - 0.82]), hi.extrude(0.02).translate([0, 0, h - 0.02])))


class Pawn:
    def __init__(self, key, title, slots):
        self.key, self.title, self.slots = key, title, list(slots)
        self.parts = []
        self.slot_of = {}
        self.view_yaw = -24.0

    def add(self, part, colour, m, slot=None):
        if m.is_empty():
            return m
        self.parts.append([part, colour, m])
        self.slot_of[part] = self.slots.index(colour if slot is None else slot) + 1
        return m

    def carve(self, m, only=None):
        for p in self.parts:
            if only is None or p[0] in only:
                p[2] = p[2] - m

    def clip(self, region, keep=("podstawka",)):
        for p in self.parts:
            if p[0] not in keep:
                p[2] = p[2] ^ region

    def scale_about_base(self, s, keep=("podstawka",)):
        for p in self.parts:
            if p[0] not in keep:
                p[2] = p[2].translate([0, 0, -BASE_H]).scale([s, s, s]).translate([0, 0, BASE_H])

    def transform_all(self, fn, keep=("podstawka",)):
        for p in self.parts:
            if p[0] not in keep:
                p[2] = fn(p[2])

    def resolved(self):
        merged, order, higher = {}, [], Manifold()
        for part, colour, m in reversed(self.parts):
            mm = m - higher if not higher.is_empty() else m
            higher = higher + m
            if part in merged:
                merged[part][1] = merged[part][1] + mm
            else:
                merged[part] = [colour, mm]
                order.append(part)
        out = []
        for part in reversed(order):
            colour, m = merged[part]
            pieces = [c for c in m.decompose() if c.volume() > 0.004]
            if pieces:
                out.append((part, colour, U(pieces)))
        return out

    def solid(self):
        whole = U([p[2] for p in self.parts])
        return U([c for c in whole.decompose() if c.volume() > 0])


def mesh_arrays(m):
    mesh = m.to_mesh()
    return np.asarray(mesh.vert_properties, np.float64)[:, :3], np.asarray(mesh.tri_verts, np.int64)


def mass_props(m):
    v, f = mesh_arrays(m)
    a, b, c = v[f[:, 0]], v[f[:, 1]], v[f[:, 2]]
    vol6 = np.einsum("ij,ij->i", a, np.cross(b, c))
    vol = vol6.sum() / 6.0
    com = ((a + b + c) * vol6[:, None]).sum(0) / (24.0 * vol)
    return float(vol), com


def stability(m):
    vol, com = mass_props(m)
    foot = m.slice(0.25)
    pts = np.vstack(foot.hull().to_polygons())
    edges = np.roll(pts, -1, axis=0) - pts
    normals = np.column_stack([edges[:, 1], -edges[:, 0]])
    normals /= np.linalg.norm(normals, axis=1)[:, None]
    dist = np.abs(np.einsum("ij,ij->i", normals, com[:2] - pts)).min()
    return {"volume_cm3": vol / 1000.0, "com": com.round(2).tolist(), "tip_deg": math.degrees(math.atan2(dist, com[2]))}


def overhang_report(m, layer=0.16, angle=50.0, strip=0.3):
    lo = m.bounding_box()
    top = lo[5]
    reach = layer * math.tan(math.radians(angle))
    prev = m.slice(layer * 0.5)
    hits = []
    z = layer * 1.5
    while z < top:
        cur = m.slice(z)
        if not cur.is_empty():
            bad = cur - prev.offset(reach + 1e-3, JoinType.Round, 2.0, 16)
            if not bad.is_empty():
                bad = bad.offset(-strip, JoinType.Round, 2.0, 8)
                for comp in bad.decompose():
                    area = comp.area()
                    if area > 0.02:
                        b = comp.bounds()
                        hits.append((round(z, 2), area, (b[0] + b[2]) / 2, (b[1] + b[3]) / 2))
        prev = cur
        z += layer
    clusters = []
    for z, area, x, y in hits:
        for c in clusters:
            if abs(c["x"] - x) < 2.5 and abs(c["y"] - y) < 2.5 and z - c["z1"] < 0.7:
                c["z1"] = z
                c["area"] += area
                c["layers"] += 1
                c["x"] = (c["x"] + x) / 2
                c["y"] = (c["y"] + y) / 2
                break
        else:
            clusters.append({"x": x, "y": y, "z0": z, "z1": z, "area": area, "layers": 1})
    return [c for c in clusters if c["area"] > 0.25]


def islands_report(m, layer=0.12, reach=0.2):
    top = m.bounding_box()[5]
    prev = m.slice(layer * 0.5)
    found = []
    z = layer * 1.5
    while z < top:
        cur = m.slice(z)
        grown = prev.offset(reach, JoinType.Round, 2.0, 8)
        for comp in cur.decompose():
            if (comp ^ grown).is_empty():
                b = comp.bounds()
                found.append({"z": round(z, 2), "area": round(comp.area(), 3), "x": round((b[0] + b[2]) / 2, 2), "y": round((b[1] + b[3]) / 2, 2)})
        prev = cur
        z += layer
    return found
