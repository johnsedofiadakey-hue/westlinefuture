import os
import fitz  # PyMuPDF
from PIL import Image, ImageEnhance, ImageFilter

def main():
    pdf_path = "WESTLINE Workflow Manual(1).pdf"
    doc = fitz.open(pdf_path)
    output_dir = "public/workflow"
    os.makedirs(output_dir, exist_ok=True)
    
    # We will map each page and step to the correct image rect and save it.
    # The layout structure of pages 2-6:
    # Top step: index = 0, middle step: index = 1, bottom step: index = 2.
    # We will sort the images on each page by their top y-coordinate (y0) in their rects.
    
    step_num = 1
    
    # Page 1 is the cover page (let's skip or handle separately if needed)
    # Pages 2 to 6 contain the 15 steps (3 steps per page)
    for page_idx in range(1, 6):
        page = doc[page_idx]
        print(f"\nProcessing page {page_idx + 1}...")
        
        # Get all images and their rects on this page
        page_images = []
        image_info = page.get_images(full=True)
        for img in image_info:
            xref = img[0]
            rects = page.get_image_rects(xref)
            if rects:
                rect = rects[0]
                page_images.append((rect.y0, rect, xref))
        
        # Sort images by their vertical position (y0) from top to bottom
        page_images.sort(key=lambda x: x[0])
        
        print(f"Found {len(page_images)} images on page {page_idx + 1} after sorting by y0:")
        for idx, (y0, rect, xref) in enumerate(page_images):
            print(f"  Pos {idx+1}: y0={y0:.2f}, rect={rect}, xref={xref}")
            
        # Render the page at high resolution (zoom factor = 4.0 for extreme crispness)
        zoom = 4.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)
        
        # Convert fitz pixmap to PIL Image
        img_data = pix.tobytes("png")
        from io import BytesIO
        page_img = Image.open(BytesIO(img_data))
        
        # Crop each sorted step image
        for idx, (y0, rect, xref) in enumerate(page_images):
            # Scale coordinates to the high-resolution rendered image
            # PDF coordinates are in points (1 point = 1/72 inch).
            # The pixmap rendered at zoom factor has width = page.rect.width * zoom, height = page.rect.height * zoom.
            
            # Let's add a small margin of 2 points around the rect to make sure no borders are cropped
            margin = 3.0
            x0 = max(0, rect.x0 - margin) * zoom
            y0 = max(0, rect.y0 - margin) * zoom
            x1 = min(page.rect.width, rect.x1 + margin) * zoom
            y1 = min(page.rect.height, rect.y1 + margin) * zoom
            
            crop_box = (x0, y0, x1, y1)
            cropped_img = page_img.crop(crop_box)
            
            # Now let's apply sharpening and contrast adjustments to make the image look absolutely premium
            # Since these are line drawings and diagrams, we can:
            # 1. Convert to RGB if it isn't
            if cropped_img.mode != 'RGB':
                cropped_img = cropped_img.convert('RGB')
                
            # 2. Sharpen the image
            sharpened = cropped_img.filter(ImageFilter.SHARPEN)
            # Enhance detail/contrast
            enhancer = ImageEnhance.Contrast(sharpened)
            enhanced = enhancer.enhance(1.15)  # slight boost in contrast
            
            # Make sure it's crisp and clean
            out_name = f"step_{step_num}.png"
            out_path = os.path.join(output_dir, out_name)
            enhanced.save(out_path, "PNG", quality=100)
            print(f"Saved STEP {step_num} (xref: {xref}) to {out_path} (size: {enhanced.width}x{enhanced.height})")
            step_num += 1

if __name__ == "__main__":
    main()
