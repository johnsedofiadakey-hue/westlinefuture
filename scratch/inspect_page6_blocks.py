import fitz

def main():
    doc = fitz.open("WESTLINE Workflow Manual(1).pdf")
    page = doc[5]  # Page 6
    print("=== Page 6 Text Blocks ===")
    blocks = page.get_text("blocks")
    for block in blocks:
        print(f"Rect: ({block[0]:.1f}, {block[1]:.1f}, {block[2]:.1f}, {block[3]:.1f})")
        print(block[4].strip())
        print("-" * 30)

if __name__ == "__main__":
    main()
