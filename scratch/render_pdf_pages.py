import os
import fitz  # PyMuPDF

def main():
    pdf_path = "WESTLINE Workflow Manual(1).pdf"
    doc = fitz.open(pdf_path)
    output_dir = "public/workflow/pages"
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Total pages: {len(doc)}")
    for page_num in range(len(doc)):
        page = doc[page_num]
        # Set high resolution (matrix multiplication for zoom)
        zoom = 3.0  # 3x scale for crisp text and line art
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)
        output_path = os.path.join(output_dir, f"page_{page_num + 1}.png")
        pix.save(output_path)
        print(f"Saved page {page_num + 1} to {output_path} (size: {pix.width}x{pix.height})")

if __name__ == "__main__":
    main()
