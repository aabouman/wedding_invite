"""Build lightweight raster layers and the animated Choose overlay.

Run with:
  uv run --with resvg-py --with pillow python qa/build_hybrid_invitation.py
"""

from __future__ import annotations

from copy import deepcopy
from io import BytesIO
from pathlib import Path
import xml.etree.ElementTree as ET

from PIL import Image
import resvg_py


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "public" / "invitation.svg"
OUTPUT = ROOT / "public"
SVG_NS = "http://www.w3.org/2000/svg"
NS = f"{{{SVG_NS}}}"

ET.register_namespace("", SVG_NS)

MOVING_IDS = {
    "tower-flag",
    "lantern-left",
    "lantern-right",
    "sophie",
    "alex",
    "held-hands",
    "lantern-left-ink",
    "lantern-right-ink",
}

LAYERS = {
    "flag": ("tower-flag",),
    "lantern-left": ("lantern-left", "lantern-left-ink"),
    "lantern-right": ("lantern-right", "lantern-right-ink"),
    "sophie": ("sophie",),
    "alex": ("alex",),
    "hands": ("held-hands",),
}


def find_by_id(root: ET.Element, element_id: str) -> ET.Element:
    candidates = [
        element for element in root.iter() if element.get("id") == element_id
    ]
    if not candidates:
        raise ValueError(f"Missing SVG element #{element_id}")

    # The source contains empty SMIL wrappers followed by artwork groups that
    # reuse the IDs "sophie" and "alex". Prefer the candidate that actually
    # owns the most vector artwork so cropped layers are never empty.
    return max(
        candidates,
        key=lambda element: sum(1 for _ in element.iter(f"{NS}path")),
    )


def remove_by_id(root: ET.Element, element_ids: set[str]) -> None:
    parents = {child: parent for parent in root.iter() for child in parent}
    for element in list(root.iter()):
        if element.get("id") in element_ids:
            parents[element].remove(element)


def remove_animations(root: ET.Element) -> None:
    parents = {child: parent for parent in root.iter() for child in parent}
    for element in list(root.iter()):
        if element.tag in {f"{NS}animate", f"{NS}animateTransform"}:
            parents[element].remove(element)


def svg_bytes(root: ET.Element) -> bytes:
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def render(svg: bytes) -> Image.Image:
    png = resvg_py.svg_to_bytes(svg_string=svg.decode("utf-8"), width=1200, height=1500)
    return Image.open(BytesIO(png)).convert("RGBA")


def save_webp(image: Image.Image, path: Path, *, quality: int = 90) -> None:
    image.save(path, "WEBP", quality=quality, method=6, exact=True)


def build_full_frame(*, hidden_ids: set[str], destination: str, quality: int) -> None:
    root = deepcopy(SOURCE_ROOT)
    remove_by_id(root, hidden_ids)
    remove_animations(root)
    save_webp(render(svg_bytes(root)), OUTPUT / destination, quality=quality)


def build_layer(name: str, element_ids: tuple[str, ...]) -> None:
    layer_root = ET.Element(SOURCE_ROOT.tag, SOURCE_ROOT.attrib)
    defs = SOURCE_ROOT.find(f"{NS}defs")
    artwork = find_by_id(SOURCE_ROOT, "artwork")
    layer_artwork = ET.Element(artwork.tag, artwork.attrib)

    if defs is not None:
        layer_root.append(deepcopy(defs))

    for element_id in element_ids:
        source_element = find_by_id(SOURCE_ROOT, element_id)
        if source_element in list(artwork):
            layer_artwork.append(deepcopy(source_element))
        else:
            layer_root.append(deepcopy(source_element))

    if len(layer_artwork):
        layer_root.insert(1 if defs is not None else 0, layer_artwork)

    remove_animations(layer_root)
    image = render(svg_bytes(layer_root))
    alpha_box = image.getchannel("A").getbbox()
    if alpha_box is None:
        raise ValueError(f"Layer {name} rendered empty")

    left, top, right, bottom = alpha_box
    padding = 8
    box = (
        max(0, left - padding),
        max(0, top - padding),
        min(1200, right + padding),
        min(1500, bottom + padding),
    )
    cropped = image.crop(box)
    save_webp(cropped, OUTPUT / f"invitation-layer-{name}.webp", quality=92)
    print(f"{name}: x={box[0]} y={box[1]} w={box[2] - box[0]} h={box[3] - box[1]}")


def build_choose_overlay() -> None:
    overlay_root = ET.Element(SOURCE_ROOT.tag, SOURCE_ROOT.attrib)
    defs = SOURCE_ROOT.find(f"{NS}defs")
    if defs is not None:
        overlay_root.append(deepcopy(defs))
    overlay_root.append(deepcopy(find_by_id(SOURCE_ROOT, "choose-overlay")))
    (OUTPUT / "invitation-choose.svg").write_bytes(svg_bytes(overlay_root))


SOURCE_ROOT = ET.parse(SOURCE).getroot()

build_full_frame(
    hidden_ids={"choose-overlay"},
    destination="invitation-poster.webp",
    quality=91,
)
build_full_frame(
    hidden_ids=MOVING_IDS | {"choose-overlay"},
    destination="invitation-base.webp",
    quality=91,
)
for layer_name, ids in LAYERS.items():
    build_layer(layer_name, ids)
build_choose_overlay()
