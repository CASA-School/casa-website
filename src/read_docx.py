import zipfile
import xml.etree.ElementTree as ET
import os

def read_docx(file_path):
    if not os.path.exists(file_path):
        return f"File not found: {file_path}"
    try:
        with zipfile.ZipFile(file_path) as docx:
            xml_content = docx.read('word/document.xml')
            root = ET.fromstring(xml_content)
            
            # Namespace map
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            # Extract text
            paragraphs = []
            for paragraph in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
                texts = [node.text for node in paragraph.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if node.text]
                if texts:
                    paragraphs.append("".join(texts))
            return "\n".join(paragraphs)
    except Exception as e:
        return f"Error reading {file_path}: {e}"

print("=== Universum ===")
path1 = "/Users/rahmanshafiee/Downloads/OneDrive_1_6-18-2026/Kulturprogramm/Exkursionen/universum.docx"
print(read_docx(path1))

print("\n=== Klimahaus ===")
path2 = "/Users/rahmanshafiee/Downloads/OneDrive_1_6-18-2026/Kulturprogramm/Exkursionen/Klimahaus.docx"
print(read_docx(path2))
