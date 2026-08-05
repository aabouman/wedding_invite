#!/bin/zsh
# Renders ../save-the-date.svg to render.png (1200x1500) with headless Chromium,
# then scores it against the original artwork. Requires: pillow, numpy, scikit-image.
set -e
cd "$(dirname "$0")"
cat > _preview.html << HTML
<!doctype html><html><head><style>*{margin:0;padding:0}body{background:#fff}</style></head>
<body><img src="file://$PWD/../save-the-date.svg" width="1200" height="1500"></body></html>
HTML
"/Applications/Chromium.app/Contents/MacOS/Chromium" --headless --disable-gpu \
  --force-device-scale-factor=1 --screenshot=_raw.png --window-size=1200,1560 \
  --hide-scrollbars "file://$PWD/_preview.html" 2>/dev/null
python3 -c "from PIL import Image; Image.open('_raw.png').crop((0,0,1200,1500)).save('render.png')"
python3 score.py render.png
