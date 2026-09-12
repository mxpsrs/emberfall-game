"""Make a review board from credited, unchanged artist previews; never game renders."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / 'docs/boss-candidates'
DATA = json.loads((FOLDER / 'roster.json').read_text())
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
W, MARGIN, GAP, CW, CH = 1800, 48, 32, 836, 662
TOP = 176
H = TOP + CH * 3 + GAP * 2 + 94
canvas = Image.new('RGB', (W, H), '#10171a')
d = ImageDraw.Draw(canvas)

def label(x, y, text, size=24, color='#dce3dd', bold=False):
    font = ImageFont.truetype(BOLD if bold else FONT, size)
    d.text((x, y), text, font=font, fill=color)

label(MARGIN, 35, 'EMBERFALL  /  BOSS MODEL SHORTLIST', 39, '#f2e8cc', True)
label(MARGIN, 92, 'Original artist previews  •  Proposed names  •  Not yet imported into the game', 25)
for i, model in enumerate(DATA['models']):
    x = MARGIN + (i % 2) * (CW + GAP)
    y = TOP + (i // 2) * (CH + GAP)
    d.rounded_rectangle((x, y, x + CW, y + CH), radius=13, fill='#1d272a', outline='#3d4847', width=2)
    label(x + 24, y + 18, model['name'], 29, '#f2e8cc', True)
    # The last pair has a separate status line to keep names legible at phone width.
    subtitle = model['subtitle'].split(' | ')[0] if i >= 4 else model['subtitle']
    label(x + 24, y + 58, subtitle, 21, '#bbc9c6')
    art = Image.open(FOLDER / model['image']).convert('RGB')
    art = ImageOps.contain(art, (CW - 40, 475), Image.Resampling.LANCZOS)
    box_x, box_y = x + 20, y + 98
    d.rectangle((box_x, box_y, box_x + CW - 40, box_y + 475), fill='#070b0c')
    canvas.paste(art, (box_x + (CW - 40 - art.width) // 2, box_y + (475 - art.height) // 2))
    label(x + 24, y + 588, model['animation_badge'], 21, '#e3c18a' if i >= 4 or i == 0 else '#b9d7ba')
    license_short = 'Royalty Free' if model['license'].startswith('CGTrader') else model['license']
    label(x + 24, y + 622, model['artist'] + '  •  ' + license_short, 19, '#a9bbb7')
label(MARGIN, H - 55, 'Names and encounter roles are proposals. Source previews retain the artists’ lighting and materials.', 23, '#b8c6c2')
canvas.save(FOLDER / 'boss-shortlist.jpg', quality=94, subsampling=0)
print(FOLDER / 'boss-shortlist.jpg')
