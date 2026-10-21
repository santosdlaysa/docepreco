import fitz
from pathlib import Path

pdf_path = Path(r"C:\dev\sweet-pricing\output\pdf\plano-marketing-docepreco-90-dias.pdf")
output_dir = Path(r"C:\dev\sweet-pricing\tmp\pdfs\rendered")
output_dir.mkdir(parents=True, exist_ok=True)

document = fitz.open(pdf_path)
for index, page in enumerate(document, start=1):
    pixmap = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
    pixmap.save(output_dir / f"marketing-plan-{index}.png")

print(f"Rendered {len(document)} pages")
