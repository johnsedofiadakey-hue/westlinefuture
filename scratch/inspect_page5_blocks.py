import fitz

def main():
    doc = fitz.open("WESTLINE Workflow Manual(1).pdf")
    page = doc[4]  # Page 5
    print("=== Page 5 Text Blocks ===")
    blocks = page.get_text("blocks")
    for block in blocks:
        # block structure: (x0, y0, x1, y1, "text", block_no, block_type)
        print(f"Rect: ({block[0]:.1f}, {block[1]:.1f}, {block[2]:.1f}, {block[3]:.1f})")
        print(block[4].strip())
        print("-" * 30)

if __name__ == "__main__":
    main()
