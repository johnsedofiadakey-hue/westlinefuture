import os
from PIL import Image

logo_path = "/Users/truth/Developer/Westline Future/public/logo.png"
if not os.path.exists(logo_path):
    print("Error: public/logo.png does not exist")
    exit(1)

img = Image.open(logo_path).convert("RGBA")
width, height = img.size

opaque_pixels = 0
semi_transparent = 0
fully_transparent = 0
white_opaque = 0
other_colors = {}

for y in range(height):
    for x in range(width):
        r, g, b, a = img.getpixel((x, y))
        if a == 0:
            fully_transparent += 1
        elif a == 255:
            opaque_pixels += 1
            if r == 255 and g == 255 and b == 255:
                white_opaque += 1
            else:
                color = (r, g, b)
                other_colors[color] = other_colors.get(color, 0) + 1
        else:
            semi_transparent += 1

print(f"Total pixels: {width * height}")
print(f"Fully transparent pixels (alpha=0): {fully_transparent}")
print(f"Opaque pixels (alpha=255): {opaque_pixels}")
print(f"  Opaque pure white: {white_opaque}")
print(f"  Opaque other colors: {len(other_colors)} distinct colors, total count {sum(other_colors.values())}")
print(f"Semi-transparent pixels: {semi_transparent}")

if len(other_colors) > 0:
    print("Some other opaque colors:")
    sorted_colors = sorted(other_colors.items(), key=lambda x: x[1], reverse=True)
    for c, cnt in sorted_colors[:10]:
        print(f"  Color {c}: count {cnt}")
