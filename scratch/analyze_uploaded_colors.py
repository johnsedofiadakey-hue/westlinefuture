import os
from PIL import Image
from collections import Counter

def get_dominant_colors(image_path, num_colors=10):
    try:
        img = Image.open(image_path)
        img = img.convert("RGBA")
        img = img.resize((150, 150))  # Resize to speed up
        pixels = list(img.getdata())
        
        # Filter out fully transparent pixels if any
        opaque_pixels = [p[:3] for p in pixels if p[3] > 0]
        
        counter = Counter(opaque_pixels)
        most_common = counter.most_common(num_colors)
        
        print(f"\nDominant colors for {os.path.basename(image_path)}:")
        for (r, g, b), count in most_common:
            hex_color = f"#{r:02x}{g:02x}{b:02x}"
            print(f"  {hex_color} : {count} pixels (RGB: {r},{g},{b})")
    except Exception as e:
        print(f"Error reading {image_path}: {e}")

def main():
    folder = "/Users/truth/.gemini/antigravity-ide/brain/658fd89a-004f-450f-93ac-0effc9b5df45/.tempmediaStorage"
    for filename in sorted(os.listdir(folder)):
        if filename.endswith(".img") or filename.endswith(".png"):
            get_dominant_colors(os.path.join(folder, filename))
            
    # Also inspect images in the main brain folder
    brain_folder = "/Users/truth/.gemini/antigravity-ide/brain/658fd89a-004f-450f-93ac-0effc9b5df45"
    for filename in sorted(os.listdir(brain_folder)):
        if filename.endswith(".png") and "media__" in filename:
            get_dominant_colors(os.path.join(brain_folder, filename))

if __name__ == "__main__":
    main()
