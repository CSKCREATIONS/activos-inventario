import io
import base64
import tempfile
from reportlab.lib.pagesizes import LETTER
from reportlab.lib import colors
from reportlab.pdfgen.canvas import Canvas
import os

FIRMA_EJEMPLO = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

def generar_pdf_prueba():
    packet = io.BytesIO()
    c = Canvas(packet, pagesize=LETTER)
    
    x, y = 150, 185
    
    # Texto
    c.setFont("Helvetica", 12)
    c.drawString(50, 750, "PRUEBA DE FIRMA")
    
    # Rectángulo rojo
    c.setStrokeColor(colors.red)
    c.setLineWidth(2)
    c.rect(x, y - 40, 120, 50)
    
    # Texto azul
    c.setFillColor(colors.blue)
    c.drawString(x, y - 5, "=== ZONA DE FIRMA ===")
    c.setFillColor(colors.black)
    
    # Escribir el nombre de la firma
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x, y - 20, "Firmante: Ana López (prueba)")
    
    # Línea de firma
    c.setLineWidth(1)
    c.line(x, y - 45, x + 100, y - 45)
    
    c.showPage()
    c.save()
    packet.seek(0)
    
    with open("prueba_firma.pdf", "wb") as f:
        f.write(packet.getvalue())
    
    print("✅ PDF generado: prueba_firma.pdf")
    print("Abre el archivo y verifica que veas:")
    print("1. Texto 'PRUEBA DE FIRMA'")
    print("2. Rectángulo rojo")
    print("3. Texto azul '=== ZONA DE FIRMA ==='")
    print("4. Texto 'Firmante: Ana López (prueba)'")
    print("5. Una línea negra")

if __name__ == "__main__":
    generar_pdf_prueba()