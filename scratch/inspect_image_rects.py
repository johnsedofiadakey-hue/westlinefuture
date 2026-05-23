import fitz

def main():
    doc = fitz.open("WESTLINE Workflow Manual(1).pdf")
    for page_num in range(len(doc)):
        page = doc[page_num]
        image_info = page.get_images(full=True)
        print(f"\n--- PAGE {page_num + 1} ({page.rect}) ---")
        print(f"Number of images: {len(image_info)}")
        
        # Let's inspect where images are located
        for img_idx, img in enumerate(image_info):
            xref = img[0]
            # Get list of rects where this image is placed on the page
            rects = page.get_image_rects(xref)
            print(f"  Image {img_idx + 1} (xref: {xref}): rects={rects}")

if __name__ == "__main__":
    main()
