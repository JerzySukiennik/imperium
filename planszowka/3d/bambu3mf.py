"""Bambu Studio 3MF writer: multi-part objects with per-part filament slots and optional project settings."""
import json
import uuid
import zipfile
from xml.sax.saxutils import quoteattr

CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
 <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
 <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
 <Default Extension="png" ContentType="image/png"/>
 <Default Extension="gcode" ContentType="text/x.gcode"/>
</Types>
"""
RELS = """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>
"""
MODEL_HEAD = ('<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" '
              'xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" '
              'xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p">\n')
IDENTITY = "1 0 0 0 1 0 0 0 1 0 0 0"


def mesh_xml(obj_id, verts, tris):
    out = [f'  <object id="{obj_id}" p:UUID="{uuid.uuid4()}" type="model">\n   <mesh>\n    <vertices>\n']
    out += [f'     <vertex x="{v[0]:.5f}" y="{v[1]:.5f}" z="{v[2]:.5f}"/>\n' for v in verts]
    out.append("    </vertices>\n    <triangles>\n")
    out += [f'     <triangle v1="{t[0]}" v2="{t[1]}" v3="{t[2]}"/>\n' for t in tris]
    out.append("    </triangles>\n   </mesh>\n  </object>\n")
    return "".join(out)


def write_3mf(path, objects, settings=None, title="Pionki", version="02.08.02.61"):
    next_id = 1
    files, main_objects, build, rels, config, instances, assemble = {}, [], [], [], [], [], []
    for index, obj in enumerate(objects, 1):
        sub = f"/3D/Objects/object_{index}.model"
        body, components, parts_cfg = [], [], []
        for part in obj["parts"]:
            pid, next_id = next_id, next_id + 1
            body.append(mesh_xml(pid, part["verts"], part["tris"]))
            components.append(f'    <component p:path="{sub}" objectid="{pid}" p:UUID="{uuid.uuid4()}" transform="{IDENTITY}"/>\n')
            parts_cfg.append(
                f'    <part id="{pid}" subtype="normal_part">\n      <metadata key="name" value={quoteattr(part["name"])}/>\n'
                f'      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>\n      <metadata key="source_file" value={quoteattr(obj["name"] + ".3mf")}/>\n'
                f'      <metadata key="source_object_id" value="0"/>\n      <metadata key="source_volume_id" value="{len(parts_cfg)}"/>\n'
                f'      <metadata key="source_offset_x" value="0"/>\n      <metadata key="source_offset_y" value="0"/>\n      <metadata key="source_offset_z" value="0"/>\n'
                f'      <metadata key="extruder" value="{part["extruder"]}"/>\n'
                f'      <mesh_stat face_count="{len(part["tris"])}" edges_fixed="0" degenerate_facets="0" facets_removed="0" facets_reversed="0" backwards_edges="0"/>\n    </part>\n')
        files[sub.lstrip("/")] = MODEL_HEAD + ' <metadata name="BambuStudio:3mfVersion">1</metadata>\n <resources>\n' + "".join(body) + " </resources>\n <build/>\n</model>\n"
        oid, next_id = next_id, next_id + 1
        main_objects.append(f'  <object id="{oid}" p:UUID="{uuid.uuid4()}" type="model">\n   <components>\n' + "".join(components) + "   </components>\n  </object>\n")
        x, y = obj.get("pos", (128.0, 128.0))
        transform = f"1 0 0 0 1 0 0 0 1 {x:.4f} {y:.4f} 0"
        build.append(f'  <item objectid="{oid}" p:UUID="{uuid.uuid4()}" transform="{transform}" printable="1"/>\n')
        rels.append(f' <Relationship Target="{sub}" Id="rel-{index}" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n')
        faces = sum(len(part["tris"]) for part in obj["parts"])
        config.append(f'  <object id="{oid}">\n    <metadata key="name" value={quoteattr(obj["name"])}/>\n'
                      f'    <metadata key="extruder" value="{obj["parts"][0]["extruder"]}"/>\n    <metadata face_count="{faces}"/>\n' + "".join(parts_cfg) + "  </object>\n")
        instances.append(f'    <model_instance>\n      <metadata key="object_id" value="{oid}"/>\n      <metadata key="instance_id" value="0"/>\n'
                         f'      <metadata key="identify_id" value="{100 + index}"/>\n    </model_instance>\n')
        assemble.append(f'   <assemble_item object_id="{oid}" instance_id="0" transform="{transform}" offset="0 0 0" />\n')
    files["3D/3dmodel.model"] = (MODEL_HEAD + f' <metadata name="Application">BambuStudio-{version}</metadata>\n <metadata name="BambuStudio:3mfVersion">1</metadata>\n'
                                 f' <metadata name="Title">{title}</metadata>\n <resources>\n' + "".join(main_objects) + " </resources>\n"
                                 f' <build p:UUID="{uuid.uuid4()}">\n' + "".join(build) + " </build>\n</model>\n")
    files["3D/_rels/3dmodel.model.rels"] = ('<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n'
                                            + "".join(rels) + "</Relationships>\n")
    files["Metadata/model_settings.config"] = ('<?xml version="1.0" encoding="UTF-8"?>\n<config>\n' + "".join(config)
                                               + '  <plate>\n    <metadata key="plater_id" value="1"/>\n    <metadata key="plater_name" value=""/>\n'
                                               '    <metadata key="locked" value="false"/>\n' + "".join(instances) + "  </plate>\n  <assemble>\n" + "".join(assemble) + "  </assemble>\n</config>\n")
    if settings is not None:
        files["Metadata/project_settings.config"] = json.dumps(settings, indent=4, ensure_ascii=False)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CONTENT_TYPES)
        z.writestr("_rels/.rels", RELS)
        for name, text in files.items():
            z.writestr(name, text)
