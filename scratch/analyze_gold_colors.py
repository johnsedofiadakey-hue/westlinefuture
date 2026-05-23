import os
from PIL import Image

def find_gold_pixels(image_path):
    img = Image.open(image_path)
    img = img.convert("RGB")
    width, height = img.size
    
    # We want to find pixels that are not very dark (r > 100, g > 80) and have a gold-ish hue (r > g > b)
    gold_colors = []
    for x in range(width):
        for y in range(height):
            r, g, b = img.getpixel((x, y))
            if r > 120 and g > 100 and r > g and g > b:
                gold_colors.append((r, g, b))
                
    from collections import Counter
    counter = Counter(gold_colors)
    print(f"\nGold colors in {os.path.basename(image_path)}:")
    for (r, g, b), count in counter.most_common(15):
        hex_color = f"#{r:02x}{g:02x}{b:02x}"
        print(f"  {hex_color} : {count} pixels (RGB: {r},{g},{b})")

def main():
    find_gold_pixels("/Users/truth/.gemini/antigravity-ide/brain/658fd89a-004f-450f-93ac-0effc9b5df45/media__1779437045045.png")

if __name__ == "__main__":
    main()
