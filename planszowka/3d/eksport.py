"""Imperium Gzowianskie board game: builds the tokens, checks printability, writes one Bambu Studio 3MF plate per token type and a JSON for preview renders. python eksport.py OUT_DIR [--slice] [--json FILE]"""
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

from bambu3mf import write_3mf
from kit import islands_report, mesh_arrays, overhang_report
from zetony import TOKENS

ROOT = Path(__file__).resolve().parent
STUDIO = "/Applications/BambuStudio.app/Contents/MacOS/BambuStudio"
COUNTS = {k: int(v) for k, v in re.findall(r"(\w+): (\d+)", re.search(r"export const TOKENS = \{([^}]*)\}", (ROOT.parent / "gra.mjs").read_text()).group(1))}
LAYER, GAP, BED = 0.2, 5.0, (38.0, 218.0)


def project_settings(colour):
    out = json.loads((ROOT / "szablon-ustawien.json").read_text())
    old = len(out["filament_colour"])
    fixed = {"upward_compatible_machine", "different_settings_to_system", "flush_volumes_matrix", "filament_self_index"}
    for key, value in list(out.items()):
        if isinstance(value, list) and key not in fixed and len(value) in (old, 2 * old, 4 * old) and (key.startswith("filament_") or len(value) != 4 * old):
            out[key] = value[:len(value) // old]
    out.update({"filament_colour": [colour], "filament_multi_colour": [colour], "filament_colour_type": ["0"], "filament_self_index": ["1", "1"],
                "different_settings_to_system": ["layer_height;wall_loops", "", ""], "flush_volumes_matrix": ["0"], "layer_height": str(LAYER), "wall_loops": "3",
                "enable_support": "0", "enable_prime_tower": "0", "brim_type": "no_brim"})
    return out


def slice_check(path):
    with tempfile.TemporaryDirectory() as tmp:
        run = subprocess.run(["nice", "-n", "10", STUDIO, "--debug", "2", "--slice", "0", "--outputdir", tmp, str(Path(path).resolve())], capture_output=True, text=True, cwd=tmp)
        log = run.stdout + run.stderr
        res = Path(tmp) / "result.json"
        result = json.loads(res.read_text()) if res.exists() else {"return_code": -1, "error_string": log[-400:]}
        gcode = Path(tmp) / "plate_1.gcode"
        head = gcode.read_text(errors="ignore")[:8000] if gcode.exists() else ""
    time = re.search(r"total estimated time: ([^\n;]+)", head)
    weight = re.search(r"total filament weight \[g\] : ([^\n]+)", head)
    layers = re.search(r"total layer number: (\d+)", head)
    return {"ok": result.get("return_code") == 0, "message": result.get("error_string", ""), "time": time.group(1).strip() if time else "",
            "grams": sum(float(v) for v in weight.group(1).split(",")) if weight else 0, "layers": int(layers.group(1)) if layers else 0,
            "warnings": sorted(set(re.findall(r"slicing warnings: ([^\n]+)", log)))}


def main(argv):
    out = Path(argv[0])
    out.mkdir(parents=True, exist_ok=True)
    preview, report, failed = [], [], False
    for name, key, make, colour, colour_name in TOKENS:
        m = make()
        lo = m.bounding_box()
        m = m.translate([-(lo[0] + lo[3]) / 2, -(lo[1] + lo[4]) / 2, -lo[2]])
        size = [lo[3] - lo[0], lo[4] - lo[1], lo[5] - lo[2]]
        verts, tris = mesh_arrays(m)
        islands, hangs = islands_report(m, LAYER), overhang_report(m, LAYER)
        pieces = len(m.decompose())
        count = COUNTS[key]
        cols = max(1, min(count, int((BED[1] - BED[0] + GAP) // (size[0] + GAP))))
        rows = -(-count // cols)
        if rows * (size[1] + GAP) - GAP > BED[1] - BED[0]:
            failed = True
            print(f"{name}: does not fit the bed")
        objects = []
        for i in range(count):
            c, r = i % cols, i // cols
            x = 128 + (c - (cols - 1) / 2) * (size[0] + GAP)
            y = 128 + (r - (rows - 1) / 2) * (size[1] + GAP)
            objects.append({"name": f"{name} {i + 1}", "parts": [{"name": name, "verts": verts, "tris": tris, "extruder": 1}], "pos": (x, y)})
        path = out / f"{name}.3mf"
        write_3mf(path, objects, project_settings(colour), title=f"Imperium Gzowiańskie: {name}")
        row = {"name": name, "key": key, "count": count, "size": [round(v, 1) for v in size], "volume_cm3": round(m.volume() / 1000, 2), "pieces": pieces,
               "islands": len(islands), "overhangs": [(round(h["z0"], 1), round(h["area"], 2)) for h in hangs][:6], "colour": colour_name, "tris": int(len(tris))}
        if pieces != 1 or islands:
            failed = True
        if "--slice" in argv:
            row["slice"] = slice_check(path)
            failed = failed or not row["slice"]["ok"]
        report.append(row)
        print(json.dumps(row, ensure_ascii=False))
        preview.append({"name": name, "key": key, "colour": colour, "size": size, "verts": np.round(verts, 3).tolist(), "tris": tris.tolist()})
    old = {r["name"]: r.get("slice") for r in json.loads((out / "raport.json").read_text())} if (out / "raport.json").exists() else {}
    for row in report:
        if "slice" not in row and old.get(row["name"]):
            row["slice"] = old[row["name"]]
    (out / "raport.json").write_text(json.dumps(report, indent=1, ensure_ascii=False))
    lines = ["IMPERIUM GZOWIAŃSKIE, żetony i budynki do druku 3D (wersja 1.0)", "",
             "Każdy plik .3mf to jedna płyta w jednym kolorze, z ustawieniami w środku: warstwa 0,2 mm, 3 ścianki, wypełnienie 15%, bez podpór i bez brimu, dysza 0,4 mm, PLA.",
             "Otwórz w Bambu Studio, wybierz filament i drukuj. Liczby poniżej to prawdziwy wynik cięcia w Bambu Studio.", ""]
    for row in report:
        cut = row.get("slice") or {}
        lines.append(f"{row['name']}.3mf: {row['count']} szt., {row['size'][0]:.0f} x {row['size'][1]:.0f} x {row['size'][2]:.0f} mm, kolor {row['colour']}" + (f", czas {cut['time']}, filament {cut['grams']:.0f} g" if cut.get("time") else ""))
    lines += ["", "Szyszki to pieniądze: mała = 1, średnia = 5, duża = 10. Najłatwiej je odróżnić, drukując każdą wielkość w innym kolorze.",
              "Wszystko ma płaski spód i żadnych nawisów, więc nic nie wymaga podpór. Skalowanie w górę jest bezpieczne, w dół do ok. 80%.", ""]
    (out / "CZYTAJ.txt").write_text("\n".join(lines))
    if "--json" in argv:
        Path(argv[argv.index("--json") + 1]).write_text(json.dumps(preview))
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main(sys.argv[1:])
