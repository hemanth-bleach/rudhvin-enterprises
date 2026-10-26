import json

with open('rupee_fonts.json', 'r') as f:
    data = json.load(f)

content = (
    "// Base64 encoded WOFF fonts subsetted specifically for Unicode U+20B9 (Indian Rupee Sign)\n"
    "// Ensures offline, cross-platform PDF generation without missing glyphs in headless environments.\n\n"
    f"export const RUPEE_FONT_REGULAR_BASE64 = '{data['regular']}';\n\n"
    f"export const RUPEE_FONT_BOLD_BASE64 = '{data['bold']}';\n"
)

with open('backend/src/assets/fonts_base64.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Wrote backend/src/assets/fonts_base64.js successfully!')
