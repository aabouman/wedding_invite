"""Objective parity metrics: render vs original (both composited over white, 1200x1500).

Usage: python3 score.py <render.png>  (render of save-the-date.svg at 1200x1500)
See render.sh for producing the render with headless Chromium.
Metrics:
  1. global_rmse      — RGB root-mean-square error (0-255 scale, lower better)
  2. global_ssim      — grayscale structural similarity (0-1, higher better)
  3. edge_f1          — F1 overlap of dilated Sobel edge maps (line placement/weight)
  4. region ΔE        — CIEDE2000 distance between median wash colors per element
  5. region ink Δ     — |non-white coverage fraction difference| per element
"""
import sys
import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity as ssim
from skimage.color import rgb2lab, deltaE_ciede2000
from skimage.filters import sobel
from skimage.morphology import dilation, disk

REGIONS = {
  'title':        (170, 130, 900, 230),
  'spire':        (540, 340, 140, 100),
  'tower':        (540, 440, 140, 340),
  'wing-left':    (300, 570, 240, 210),
  'wing-right':   (660, 570, 240, 210),
  'entrance':     (500, 700, 210, 180),
  'lantern-L':    (60, 550, 200, 330),
  'lantern-R':    (940, 550, 200, 330),
  'corner-TL':    (0, 0, 300, 300),
  'corner-TR':    (900, 0, 300, 300),
  'corner-BL':    (0, 1200, 300, 300),
  'corner-BR':    (900, 1200, 300, 300),
  'sophie-head':  (360, 780, 220, 200),
  'sophie-body':  (380, 980, 200, 300),
  'alex-head':    (660, 780, 220, 200),
  'alex-body':    (660, 980, 220, 300),
  'names':        (330, 1290, 560, 110),
  'footer':       (250, 1420, 700, 60),
}

def load_white(path):
    im = Image.open(path).convert('RGBA')
    if im.size != (1200, 1500):
        im = im.resize((1200, 1500))
    a = np.array(im).astype(float)
    al = a[...,3:4]/255.0
    return a[...,:3]*al + 255.0*(1-al)

import os
HERE = os.path.dirname(os.path.abspath(__file__))
orig = load_white(os.path.join(HERE, '..', 'Untitled_Artwork-1 2.png'))
rend = load_white(sys.argv[1])

# 1. global RMSE
rmse = float(np.sqrt(((orig-rend)**2).mean()))

# 2. SSIM (grayscale)
g1 = orig.mean(axis=2)/255.0; g2 = rend.mean(axis=2)/255.0
s = float(ssim(g1, g2, data_range=1.0))

# 3. edge F1
e1 = sobel(g1) > 0.06
e2 = sobel(g2) > 0.06
d1 = dilation(e1, disk(4)); d2 = dilation(e2, disk(4))
prec = (e2 & d1).sum()/max(e2.sum(),1)
rec  = (e1 & d2).sum()/max(e1.sum(),1)
f1 = 2*prec*rec/max(prec+rec, 1e-9)

print(f'GLOBAL  rmse={rmse:6.2f}  ssim={s:.4f}  edge_f1={f1:.4f} (p={prec:.3f} r={rec:.3f})')

# 3b. spatial steering: worst 80px tiles by RMSE (finer than the semantic regions)
T = 80
th, tw = 1500 // T, 1200 // T
tile_err = np.sqrt(((orig - rend) ** 2).mean(axis=2))
tiles = tile_err[:th*T, :tw*T].reshape(th, T, tw, T).mean(axis=(1, 3))
worst = sorted(((tiles[r_, c_], c_*T, r_*T) for r_ in range(th) for c_ in range(tw)), reverse=True)[:8]
print('\nworst tiles (80px):', '  '.join(f'({x},{y})={v:.0f}' for v, x, y in worst))
print()
print(f'{"region":13s} {"dE_med":>7s} {"ink_o":>6s} {"ink_r":>6s} {"inkΔ":>6s} {"rmse":>7s}')

def med_nonwhite(p):
    nw = p[(p<235).any(axis=1)]
    return np.median(nw, axis=0) if len(nw) > 30 else None

rows = []
for name,(x,y,w,h) in REGIONS.items():
    po = orig[y:y+h, x:x+w].reshape(-1,3)
    pr = rend[y:y+h, x:x+w].reshape(-1,3)
    mo, mr = med_nonwhite(po), med_nonwhite(pr)
    if mo is None or mr is None:
        de = float('nan')
    else:
        de = float(deltaE_ciede2000(rgb2lab(mo[None,None]/255.0), rgb2lab(mr[None,None]/255.0))[0,0])
    io = float(((po<235).any(axis=1)).mean())
    ir = float(((pr<235).any(axis=1)).mean())
    rr = float(np.sqrt(((po-pr)**2).mean()))
    rows.append((name, de, io, ir, abs(io-ir), rr))

for name, de, io, ir, dd, rr in sorted(rows, key=lambda r: -(r[1] if r[1]==r[1] else 0)):
    print(f'{name:13s} {de:7.1f} {io:6.2f} {ir:6.2f} {dd:6.2f} {rr:7.1f}')
