from pathlib import Path

import resvg_py


ROOT = Path(__file__).resolve().parent.parent
SVG_PATH = ROOT / "public" / "invitation.svg"
PNG_PATH = ROOT / "public" / "invitation-preview-svg.png"


PNG_PATH.write_bytes(
    resvg_py.svg_to_bytes(
        svg_path=str(SVG_PATH),
        resources_dir=str(SVG_PATH.parent),
        width=1200,
        height=1500,
        # resvg resolves SMIL masks statically. Hide the animated replacement
        # lettering so this raster represents the SVG's true frame-zero state.
        style_sheet="#choose-overlay { display: none; }",
    )
)
