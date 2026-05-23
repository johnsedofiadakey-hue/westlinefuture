import os
from PIL import Image
from collections import Counter

image_path = "/Users/truth/.gemini/antigravity-ide/brain/658fd89a-004f-450f-93ac-0effc9b5df45/media__1779432103757.png"
if not os.path.exists(image_path):
    print("Error: file does not exist")
    exit(1)

img = Image.open(image_path).convert("RGBA")
width, height = img.size

# Corner background color
bg_color = (19, 22, 67)

colors = []
for y in range(height):
    for x in range(width):
        r, g, b, a = img.getpixel((x, y))
        # If it's sufficiently different from the background
        dist = abs(r - bg_color[0]) + abs(g - bg_color[1]) + abs(b - bg_color[2])
        if dist > 30:
            # Round color to group similar shades
            colors.append((r // 10 * 10, g // 10 * 10, b // 10 * 10))

counter = Counter(colors)
print("Top 15 foreground colors (rounded):")
for color, count in counter.most_common(15):
    print(f"Color: RGB{color}, Count: {count}")
