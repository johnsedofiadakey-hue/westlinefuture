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
        
        # Calculate how far the pixel is from the background color
        # Since the foreground logo is white/light grey, its R and G values 
        # increase significantly from 19 and 22 towards 240+.
        # We can use R as our main reference channel.
        if r <= 22:
            alpha = 0
        elif r >= 200:
            alpha = 255
        else:
            alpha = int(255 * (r - 22) / (200 - 22))
            
        # Write pure white foreground with computed alpha for flawless anti-aliasing
        out_data.append((255, 255, 255, alpha))

out_img.putdata(out_data)

# Save to destination paths
dest_paths = [
    "/Users/truth/Developer/Westline Future/public/logo.png",
    "/Users/truth/Developer/Westline Future/src/assets/logo.png"
]

for p in dest_paths:
    # Ensure parent directories exist
    os.makedirs(os.path.dirname(p), exist_ok=True)
    out_img.save(p, "PNG")
    print(f"Saved transparent logo to: {p}")

print("Logo processing completed successfully!")
