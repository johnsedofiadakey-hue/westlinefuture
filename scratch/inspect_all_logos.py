import os
from PIL import Image

artifacts_dir = "/Users/truth/.gemini/antigravity-ide/brain/658fd89a-004f-450f-93ac-0effc9b5df45"
images = [
    "media__1779402679042.png",
    "media__1779431900901.png",
    "media__1779432103757.png"
]

for name in images:
    path = os.path.join(artifacts_dir, name)
    if os.path.exists(path):
        img = Image.open(path)
        print(f"File: {name}")
        print(f"  Size: {img.size}")
        print(f"  Mode: {img.mode}")
        # Get corner pixel
        try:
            corner = img.getpixel((5, 5))
            print(f"  Corner (5, 5): {corner}")
            corner_bottom = img.getpixel((img.size[0] - 5, img.size[1] - 5))
            print(f"  Corner (bottom): {corner_bottom}")
        except Exception as e:
            print(f"  Error reading pixel: {e}")
    else:
        print(f"File {name} does not exist")
