import os
from PIL import Image

def main():
    folder = "public/workflow"
    for filename in sorted(os.listdir(folder)):
        if filename.endswith(".png"):
            filepath = os.path.join(folder, filename)
            with Image.open(filepath) as img:
                print(f"{filename}: size={img.size}, mode={img.mode}")

if __name__ == "__main__":
    main()
