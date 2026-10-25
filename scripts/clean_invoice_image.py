import os
from PIL import Image
import numpy as np

def clean_invoice():
    src_path = 'C:/Users/Hemanth/.gemini/antigravity/brain/eabc6808-e108-4921-adf9-ae6dce770017/.user_uploaded/media_1792817063822_5bdb7e55.jpg'
    img = Image.open(src_path)
    print(f'Original Image Format: {img.format}, Size: {img.size}, Mode: {img.mode}')
    
    arr = np.array(img).copy()
    
    # 1. Remove the small black bracket-shaped mark beside the company address
    # At line 1 of address: "...Near Kalabharathi,"
    # The comma is at x=671..673, y=70..74.
    # The stray vertical bracket mark is at x=674..677, y=69..74.
    arr[69:75, 674:678] = [255, 255, 255]
    print('Cleaned bracket-shaped mark beside company address (x=674..677, y=69..74)')
    
    # 2. Restore white background cleanly around GSTIN below the logo
    # Clean whitespace above GSTIN (y: 89 to 102, x: 55 to 284)
    patch_above = arr[89:103, 55:284]
    mask_above = np.mean(patch_above, axis=2) > 225
    patch_above[mask_above] = [255, 255, 255]
    
    # Clean whitespace below GSTIN (y: 115 to 124, x: 55 to 284)
    patch_below = arr[115:124, 55:284]
    mask_below = np.mean(patch_below, axis=2) > 225
    patch_below[mask_below] = [255, 255, 255]
    
    # Clean whitespace left of GSTIN (x: 40 to 112, y: 95 to 120)
    patch_left = arr[95:120, 40:112]
    mask_left = np.mean(patch_left, axis=2) > 225
    patch_left[mask_left] = [255, 255, 255]
    
    # Clean whitespace right of GSTIN before bullet (x: 272 to 283, y: 95 to 120)
    patch_right = arr[95:120, 272:284]
    mask_right = np.mean(patch_right, axis=2) > 225
    patch_right[mask_right] = [255, 255, 255]
    print('Restored pristine white background around GSTIN text and below logo')

    cleaned = Image.fromarray(arr)
    
    # Save locations
    targets = [
        'C:/Users/Hemanth/.gemini/antigravity/brain/eabc6808-e108-4921-adf9-ae6dce770017/cleaned_invoice.png',
        'C:/Users/Hemanth/.gemini/antigravity/brain/eabc6808-e108-4921-adf9-ae6dce770017/cleaned_invoice.jpg',
        'c:/Rudhvin enterprices/cleaned_invoice.png',
        'c:/Rudhvin enterprices/cleaned_invoice.jpg',
        'c:/Rudhvin enterprices/frontend/public/cleaned_invoice.png',
        'c:/Rudhvin enterprices/frontend/public/cleaned_invoice.jpg'
    ]
    
    for t in targets:
        os.makedirs(os.path.dirname(t), exist_ok=True)
        if t.endswith('.jpg'):
            cleaned.save(t, 'JPEG', quality=100, subsampling=0)
        else:
            cleaned.save(t, 'PNG', optimize=True)
        print(f'Saved: {t} ({os.path.getsize(t)} bytes)')

if __name__ == '__main__':
    clean_invoice()
