import os
import base64
from PIL import Image

# Ensure asset directories exist
os.makedirs('backend/src/assets', exist_ok=True)
os.makedirs('frontend/src/assets', exist_ok=True)

# Copy png to assets
logo_path = 'frontend/public/rudhvin_logo.png'
with open(logo_path, 'rb') as f:
    b64 = base64.b64encode(f.read()).decode('utf-8')

data_uri = f'data:image/png;base64,{b64}'

with open('backend/src/assets/logo_base64.js', 'w', encoding='utf-8') as f:
    f.write(f'export const LOGO_DATA_URI = "{data_uri}";\n')

with open('frontend/src/assets/logo_base64.js', 'w', encoding='utf-8') as f:
    f.write(f'export const LOGO_DATA_URI = "{data_uri}";\n')

# Copy PNGs to frontend/src/assets and backend/uploads
img = Image.open(logo_path)
img.save('frontend/src/assets/rudhvin_logo.png')
img.save('backend/src/assets/rudhvin_logo.png')

print("Logo assets generated successfully!")
