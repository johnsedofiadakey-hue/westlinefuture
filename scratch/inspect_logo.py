import os
from PIL import Image

image_path = "/Users/truth/.gemini/antigravity-ide/brain/658fd89a-004f-450f-93ac-0effc9b5df45/media__1779432103757.png"
if not os.path.exists(image_path):
    print("Error: file does not exist")
    exit(1)

img = Image.open(image_path)
print(f"Image size: {img.size}")
print(f"Image mode: {img.mode}")

# Let's inspect a few pixels from the corners and center
width, height = img.size
pixels = list(img.getdata())

# Corner pixel (likely background)
corner = img.getpixel((10, 10))
print(f"Corner pixel at (10, 10): {corner}")

# Find some white pixel
white_pixels = []
for y in range(height):
    for x in range(width):
        p = img.getpixel((x, y))
        # if RGB or RGBA, check brightness
        r, g, b = p[:3]
        if r > 200 and g > 200 and b > 200:
            white_pixels.append((x, y, p))
            if len(white_pixels) >= 5:
                break
    if len(white_pixels) >= 5:
        break

print("Some white pixels:")
for wp in white_pixels:
    print(f"Pixel at ({wp[0]}, {wp[1]}): {wp[2]}")
