import pypdf

def main():
    reader = pypdf.PdfReader("WESTLINE Workflow Manual(1).pdf")
    print(f"Total pages: {len(reader.pages)}")
    for idx, page in enumerate(reader.pages):
        text = page.extract_text()
        print(f"\n--- PAGE {idx+1} ---")
        print(text)

if __name__ == "__main__":
    main()
