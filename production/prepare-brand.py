"""Trace the approved Higgsfield lockup into resolution-independent SVG paths.

Setup: python -m pip install Pillow vtracer==0.6.15
Usage: python production/prepare-brand.py /path/to/tensa-brand-lockup.png
The source artwork and proportions are retained; only the raster packaging is
replaced. No pixel image, texture, SVG filter or raster mask is embedded.
"""
from pathlib import Path
import sys, tempfile, xml.etree.ElementTree as ET
from PIL import Image
import vtracer

SOURCE = Path(sys.argv[1])
OUTPUT = Path(__file__).resolve().parent.parent / 'dist/assets/brand/tensa-lockup-vector.svg'
NS = '{http://www.w3.org/2000/svg}'
source = Image.open(SOURCE).convert('L')
if source.size != (6336, 2688):
    raise ValueError('Expected the approved 6336 x 2688 Higgsfield source')

def trace(bounds, tmp, name):
    # Trace at original resolution, keeping negative-space details and corners.
    source.crop(bounds).point(lambda x: 0 if x > 100 else 255).save(tmp / f'{name}.png')
    vtracer.convert_image_to_svg_py(str(tmp / f'{name}.png'), str(tmp / f'{name}.svg'),
        colormode='binary', mode='spline', filter_speckle=20,
        corner_threshold=60, length_threshold=4, max_iterations=10,
        splice_threshold=45, path_precision=2)
    paths = []
    for p in ET.parse(tmp / f'{name}.svg').getroot().iter(f'{NS}path'):
        node = ET.Element('path', {k:v for k,v in p.attrib.items() if k != 'fill'})
        paths.append(ET.tostring(node, encoding='unicode'))
    return ''.join(paths)

with tempfile.TemporaryDirectory(prefix='tensa-brand-') as directory:
    tmp = Path(directory)
    elephant = trace((42, 51, 2953, 2639), tmp, 'elephant')
    letters = trace((3077, 806, 6264, 1921), tmp, 'letters')
svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4733 1170" role="img">'
       '<title>TENSA. — Elefant und Schriftzug</title>'
       '<g fill="#f0eee8">'
       f'<g transform="scale({1316/2911:.8f} {1170/2588:.8f})">{elephant}</g>'
       f'<g transform="translate(1546 27)">{letters}</g>'
       '</g></svg>')
OUTPUT.write_text(svg)
print({'asset':str(OUTPUT), 'bytes':len(svg.encode()), 'paths':svg.count('<path')})
