import urllib.request
import io
import json
import os
import shutil
from PIL import Image
import rembg

os.makedirs('public/products', exist_ok=True)

# Copy the 4 custom-crafted microscopes to their ID locations
microscope_map = {
    '47f75e7d-5038-537f-b7d2-07725786949c': 'public/products/microscopio-trinocular.png',
    '0059581a-29f3-5ab7-84eb-b7d48b02d1fa': 'public/products/microscopio-lcd.png',
    '6da4592d-c507-5c0e-8dc3-c847347b921b': 'public/products/microscopio-olympus.png',
    'b601d3db-d3fd-52b5-8d57-8212dc2bf492': 'public/products/microscopio-pequeno.png',
}

for pid, src in microscope_map.items():
    if os.path.exists(src):
        dst = f'public/products/{pid}.png'
        shutil.copyfile(src, dst)
        print(f"Mapped {src} -> {dst}")

with open('scripts/catalog.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

print("Initializing rembg session...")
session = rembg.new_session('isnet-general-use')

updated_count = 0
for i, p in enumerate(products):
    pid = p['id']
    dst_path = f'public/products/{pid}.png'

    if os.path.exists(dst_path):
        print(f"[{i+1}/{len(products)}] Already exists: {dst_path}")
        continue

    url = p.get('imageUrl') or p.get('image')
    if not url or not url.startswith('http'):
        continue

    safe_name = p['name'].encode('ascii', 'replace').decode('ascii')
    print(f"[{i+1}/{len(products)}] Processing: {safe_name}...")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = resp.read()

        img = Image.open(io.BytesIO(data))
        img.thumbnail((500, 500), Image.Resampling.LANCZOS)
        out = rembg.remove(img, session=session)
        out.save(dst_path)
        updated_count += 1
        print(f"  -> Saved {dst_path}")
    except Exception as e:
        print(f"  -> Error on {pid}: {e}")

print(f"Completed! Total new transparent PNGs created: {updated_count}")
