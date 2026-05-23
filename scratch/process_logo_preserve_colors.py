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

# Exact background color components
bg_r, bg_g, bg_b = 19, 22, 67

for y in range(height):
    for x in range(width):
        r, g, b, a = img.getpixel((x, y))
        
        # Calculate Euclidean distance from the background color
        dist = ((r - bg_r) ** 2 + (g - bg_g) ** 2 + (b - bg_b) ** 2) ** 0.5
        
        # Threshold for pure background
        if dist < 8:
            alpha = 0
            out_data.append((0, 0, 0, 0))
        else:
            # Smooth transition for anti-aliasing
            if dist < 45:
                alpha = int(255 * (dist - 8) / (45 - 8))
            else:
                alpha = 255
            
            # Keep original colors!
            out_data.append((r, g, b, alpha))

out_img.putdata(out_data)

# Save to destination paths
dest_paths = [
    "/Users/truth/Developer/Westline Future/public/logo.png",
    "/Users/truth/Developer/Westline Future/src/assets/logo.png"
]

for p in dest_paths:
    os.makedirs(os.path.dirname(p), exist_ok=True)
    out_img.save(p, "PNG")
    print(f"Saved color-preserved transparent logo to: {p}")

print("Color-preserved logo processing completed successfully!")
