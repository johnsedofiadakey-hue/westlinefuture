import os
import sys

def main():
    pdf_path = "WESTLINE Workflow Manual(1).pdf"
    if not os.path.exists(pdf_path):
        print(f"Error: {pdf_path} not found.")
        sys.exit(1)

    print("Checking installed packages...")
    packages = []
    
    # Try fitz (PyMuPDF)
    try:
        import fitz
        print("fitz (PyMuPDF) is installed!")
        packages.append("fitz")
    except ImportError:
        print("fitz (PyMuPDF) is not installed.")

    # Try pypdf
    try:
        import pypdf
        print("pypdf is installed!")
        packages.append("pypdf")
    except ImportError:
        print("pypdf is not installed.")

    # Try pdfplumber
    try:
        import pdfplumber
        print("pdfplumber is installed!")
        packages.append("pdfplumber")
    except ImportError:
        print("pdfplumber is not installed.")

    # Let's write code to extract using what is available, or fall back to installing
    if "fitz" in packages:
        extract_with_fitz(pdf_path)
    elif "pypdf" in packages:
        extract_with_pypdf(pdf_path)
    else:
        print("No extraction packages found. We will install pypdf...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pypdf"])
        extract_with_pypdf(pdf_path)

def extract_with_fitz(pdf_path):
    import fitz
    doc = fitz.open(pdf_path)
    os.makedirs("public/workflow", exist_ok=True)
    image_count = 0
    for page_num in range(len(doc)):
        page = doc[page_num]
        image_list = page.get_images(full=True)
        print(f"Page {page_num+1} has {len(image_list)} images.")
        for img_idx, img in enumerate(image_list):
            xref = img[0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]
            image_ext = base_image["ext"]
            image_count += 1
            out_name = f"public/workflow/img_{image_count}.{image_ext}"
            with open(out_name, "wb") as f:
                f.write(image_bytes)
            print(f"Saved {out_name}")
    print(f"Extracted {image_count} images using PyMuPDF.")

def extract_with_pypdf(pdf_path):
    import pypdf
    reader = pypdf.PdfReader(pdf_path)
    os.makedirs("public/workflow", exist_ok=True)
    image_count = 0
    for page_num, page in enumerate(reader.pages):
        images = page.images
        print(f"Page {page_num+1} has {len(images)} images.")
        for img in images:
            image_count += 1
            out_name = f"public/workflow/img_{image_count}.png"
            with open(out_name, "wb") as f:
                f.write(img.data)
            print(f"Saved {out_name}")
    print(f"Extracted {image_count} images using pypdf.")

if __name__ == "__main__":
    main()
