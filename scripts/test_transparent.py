import urllib.request
import io
import json
import os
import sys
from PIL import Image
import rembg

os.makedirs('public/products', exist_ok=True)
print("Initializing rembg session...")
session = rembg.new_session('isnet-general-use')

with open('scripts/catalog.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

test_indices = [0, 1, 2, 5, 10]
for idx in test_indices:
    p = products[idx]
    url = p.get('imageUrl') or p.get('image')
    out_path = f'public/products/test_{idx}.png'
    print(f"Processing index {idx}: {p['name']} from {url}")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
        img = Image.open(io.BytesIO(data))
        img.thumbnail((600, 600), Image.Resampling.LANCZOS)
        out = rembg.remove(img, session=session)
        out.save(out_path)
        print(f"Successfully saved {out_path} ({len(out.tobytes())} bytes)")
    except Exception as e:
        print(f"Failed {idx}: {e}")
