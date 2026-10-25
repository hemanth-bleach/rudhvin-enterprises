import os
import base64
from PIL import Image
import numpy as np

def run():
    src_path = 'C:/Users/Hemanth/.gemini/antigravity/brain/eabc6808-e108-4921-adf9-ae6dce770017/.user_uploaded/media_1792895825444_a30a86d9.png'
    orig = Image.open(src_path)

    arr_v1 = np.array(orig).copy() # Clean header
    arr_v2 = np.array(orig).copy() # Text preserved

    NAVY_BLUE = [5, 44, 109, 255]
    WHITE = [255, 255, 255, 255]

    def apply_stroke_removal(arr):
        # 1. Clean upper loop and bracket mark (y: 35..53, x: 75..120)
        for y in range(35, 54):
            for x in range(75, 120):
                arr[y, x] = WHITE
        # 2. Clean loop beside logo (y: 54..55, x: 69..120)
        for y in range(54, 56):
            for x in range(69, 120):
                arr[y, x] = WHITE
        # 3. Clean loop beside ENTERPRISES (y: 56..58, x: 64..120)
        for y in range(56, 59):
            for x in range(64, 120):
                arr[y, x] = WHITE
        # 4. Clean loop passing under logo (y: 59..66, x: 15..120)
        for y in range(59, 67):
            for x in range(15, 120):
                arr[y, x] = WHITE
        # 5. Clean loop below divider line (y: 79..85, x: 10..125)
        for y in range(79, 86):
            for x in range(10, 125):
                arr[y, x] = WHITE
        # 6. Restore divider line at y=78
        for x in range(6, 500):
            arr[78, x] = NAVY_BLUE

    apply_stroke_removal(arr_v1)
    apply_stroke_removal(arr_v2)

    # V1: Area y: 67..77, x: 10..125 completely white (remove duplicate text)
    for y in range(67, 78):
        for x in range(10, 125):
            arr_v1[y, x] = WHITE

    # V2: Area y: 67..77, preserve blue text
    for y in range(67, 78):
        for x in range(10, 125):
            pix = arr_v2[y, x]
            r, g, b = int(pix[0]), int(pix[1]), int(pix[2])
            is_blue_text = (b > r + 15 and b > g + 10)
            if not is_blue_text:
                arr_v2[y, x] = WHITE

    img_v1 = Image.fromarray(arr_v1)
    img_v2 = Image.fromarray(arr_v2)

    targets_v1 = [
        'c:/Rudhvin enterprices/cleaned_invoice_clean_header.png',
        'c:/Rudhvin enterprices/cleaned_invoice_clean_header.jpg',
        'c:/Rudhvin enterprices/cleaned_invoice.png',
        'c:/Rudhvin enterprices/cleaned_invoice.jpg',
        'c:/Rudhvin enterprices/frontend/public/cleaned_invoice_clean_header.png',
        'c:/Rudhvin enterprices/frontend/public/cleaned_invoice_clean_header.jpg',
        'c:/Rudhvin enterprices/frontend/public/cleaned_invoice.png',
        'c:/Rudhvin enterprices/frontend/public/cleaned_invoice.jpg',
        'C:/Users/Hemanth/.gemini/antigravity/brain/eabc6808-e108-4921-adf9-ae6dce770017/cleaned_invoice_clean_header.png',
        'C:/Users/Hemanth/.gemini/antigravity/brain/eabc6808-e108-4921-adf9-ae6dce770017/cleaned_invoice_clean_header.jpg',
        'C:/Users/Hemanth/.gemini/antigravity/brain/eabc6808-e108-4921-adf9-ae6dce770017/cleaned_invoice.png',
        'C:/Users/Hemanth/.gemini/antigravity/brain/eabc6808-e108-4921-adf9-ae6dce770017/cleaned_invoice.jpg'
    ]

    targets_v2 = [
        'c:/Rudhvin enterprices/cleaned_invoice_text_preserved.png',
        'c:/Rudhvin enterprices/cleaned_invoice_text_preserved.jpg',
        'c:/Rudhvin enterprices/frontend/public/cleaned_invoice_text_preserved.png',
        'c:/Rudhvin enterprices/frontend/public/cleaned_invoice_text_preserved.jpg',
        'C:/Users/Hemanth/.gemini/antigravity/brain/eabc6808-e108-4921-adf9-ae6dce770017/cleaned_invoice_text_preserved.png',
        'C:/Users/Hemanth/.gemini/antigravity/brain/eabc6808-e108-4921-adf9-ae6dce770017/cleaned_invoice_text_preserved.jpg'
    ]

    for t in targets_v1:
        os.makedirs(os.path.dirname(t), exist_ok=True)
        if t.endswith('.jpg'):
            img_v1.convert('RGB').save(t, 'JPEG', quality=100, subsampling=0)
        else:
            img_v1.save(t, 'PNG', optimize=True)

    for t in targets_v2:
        os.makedirs(os.path.dirname(t), exist_ok=True)
        if t.endswith('.jpg'):
            img_v2.convert('RGB').save(t, 'JPEG', quality=100, subsampling=0)
        else:
            img_v2.save(t, 'PNG', optimize=True)

    print('Cleaned invoice images created.')

    # Update logo assets
    pure_logo = Image.open('C:/Users/Hemanth/.gemini/antigravity/brain/eabc6808-e108-4921-adf9-ae6dce770017/scratch/pure_logo_crop.png').convert('RGBA')
    arr_logo = np.array(pure_logo).copy()
    mask = (arr_logo[:, :, 0] > 240) & (arr_logo[:, :, 1] > 240) & (arr_logo[:, :, 2] > 240)
    arr_logo[mask, 3] = 0
    trans_logo = Image.fromarray(arr_logo)

    # Save to public and src
    pure_logo.convert('RGB').save('frontend/public/rudhvin_logo.png')
    trans_logo.save('frontend/public/rudhvin_logo_transparent.png')
    pure_logo.convert('RGB').save('frontend/src/assets/rudhvin_logo.png')
    trans_logo.save('frontend/src/assets/rudhvin_logo_transparent.png')
    pure_logo.convert('RGB').save('backend/src/assets/rudhvin_logo.png')
    trans_logo.save('backend/src/assets/rudhvin_logo_transparent.png')
    pure_logo.convert('RGB').save('backend/uploads/rudhvin_logo.png')
    trans_logo.save('backend/uploads/rudhvin_logo_transparent.png')

    with open('frontend/public/rudhvin_logo_transparent.png', 'rb') as f:
        b64_str = base64.b64encode(f.read()).decode('utf-8')
    data_uri = f'data:image/png;base64,{b64_str}'

    with open('backend/src/assets/logo_base64.js', 'w', encoding='utf-8') as f:
        f.write(f'export const LOGO_DATA_URI = "{data_uri}";\n')

    with open('frontend/src/assets/logo_base64.js', 'w', encoding='utf-8') as f:
        f.write(f'export const LOGO_DATA_URI = "{data_uri}";\n')

    print('Updated pure logo assets and base64 modules.')

if __name__ == '__main__':
    run()
