import os
from PIL import Image

image_path = "/Users/truth/.gemini/antigravity-ide/brain/658fd89a-004f-450f-93ac-0effc9b5df45/media__1779432103757.png"
if not os.path.exists(image_path):
    print("Error: file does not exist")
    exit(1)

img = Image.open(image_path).convert("RGBA")
width, height = img.size

out_img = Image.new("RGBA", (width, height))
out_data = []

# Background threshold and highlight thresholds
LUM_MIN = 50
LUM_MAX = 200

for y in range(height):
    for x in range(width):
        r, g, b, a = img.getpixel((x, y))
        
        # Calculate luminance
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        
        if lum < LUM_MIN:
            # Fully transparent background
            out_data.append((0, 0, 0, 0))
        elif lum >= LUM_MAX:
            # Fully opaque white logo core
            out_data.append((255, 255, 255, 255))
        else:
            # Smooth transition for anti-aliasing
            alpha = int(255 * (lum - LUM_MIN) / (LUM_MAX - LUM_MIN))
            # Force color to pure white, just adjust transparency
            out_data.append((255, 255, 255, alpha))

out_img.putdata(out_data)

dest_paths = [
    "/Users/truth/Developer/Westline Future/public/logo.png",
    "/Users/truth/Developer/Westline Future/src/assets/logo.png"
]

for p in dest_paths:
    os.makedirs(os.path.dirname(p), exist_ok=True)
    out_img.save(p, "PNG")
    print(f"Saved perfect transparent logo to: {p}")

print("Perfect transparent logo processing completed successfully!")
