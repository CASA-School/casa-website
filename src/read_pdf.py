import pypdf

pdf_path = "/Users/rahmanshafiee/Downloads/OneDrive_1_6-18-2026/Docs f Filemaker/Varalli_Hafenrundfahrt.pdf"

try:
    reader = pypdf.PdfReader(pdf_path)
    print(f"Total pages: {len(reader.pages)}")
    for i, page in enumerate(reader.pages):
        print(f"--- Page {i+1} ---")
        print(page.extract_text())
except Exception as e:
    print(f"Error reading PDF: {e}")
