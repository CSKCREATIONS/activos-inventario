#!/usr/bin/env python3
"""
Script para probar que las firmas aparecen en todas las páginas del acta.
Uso: python test_firmas_multipagina.py
"""

import os
import sys
import json
from datetime import date, datetime
from pathlib import Path

# Asegurar que podemos importar desde backend_py
sys.path.insert(0, str(Path(__file__).parent / "backend_py"))

from utils.acta_entrega_pdf import generar_acta_entrega_pdf
from utils.accesorios import formatear_accesorio

# Datos de prueba para una asignación con firmas
asignacion_prueba = {
    "id": "test-123",
    "usuario_nombre": "Juan Pérez",
    "cargo": "Gerente de TI",
    "area": "Tecnología",
    "fecha_asignacion": date.today().isoformat(),
    
    # Equipo principal
    "tipo_equipo": "Laptop",
    "placa": "EAC-TEST-001",
    "serial": "SN123456",
    "marca": "Dell",
    "modelo": "Latitude 5420",
    
    # Cantidades de equipos adicionales (para simular varias páginas)
    "equipo_cantidad": "1",
    "monitor_cantidad": "2",
    "teclado_cantidad": "1",
    "mouse_cantidad": "1",
    "impresora_cantidad": "1",
    
    # Firmas (simuladas)
    "firmas": [
        {
            "user_id": "user-001",
            "nombre": "Juan Pérez",
            "fecha": date.today().isoformat(),
            "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        },
        {
            "user_id": "user-002",
            "nombre": "María González",
            "fecha": date.today().isoformat(),
            "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
    ],
    
    "observaciones": "Equipo entregado en buen estado. Se incluyen todos los accesorios."
}

# Lista de accesorios entregados para prueba
accesorios_prueba = [
    "Monitor Dell 24\"",
    "Teclado Logitech K120",
    "Mouse USB",
    "Cargador original"
]

def main():
    print("=" * 60)
    print("Prueba de generación de acta con firmas en múltiples páginas")
    print("=" * 60)
    
    # Generar el PDF
    try:
        pdf_bytes = generar_acta_entrega_pdf(
            asignacion_prueba,
            accesorios_opciones=["Monitor", "Teclado", "Mouse", "Impresora"],
            accesorios_entregados=accesorios_prueba,
            entregado_por="Administrador del Sistema"
        )
        
        # Guardar el PDF
        output_file = "test_acta_firmas_multipagina.pdf"
        with open(output_file, "wb") as f:
            f.write(pdf_bytes)
        
        print(f"\n✅ Acta generada correctamente: {output_file}")
        print(f"   Tamaño: {len(pdf_bytes)} bytes")
        print("\n📄 Abre el archivo PDF y verifica que las firmas aparezcan en todas las páginas.")
        print("   (Si la plantilla tiene más de una página, las firmas deberían verse en cada una)")
        
        # Intentar abrir el archivo automáticamente (Windows)
        if os.name == 'nt':
            os.startfile(output_file)
        elif sys.platform == 'darwin':
            os.system(f"open {output_file}")
        else:
            os.system(f"xdg-open {output_file}")
            
    except Exception as e:
        print(f"\n❌ Error al generar el acta: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    print("\n✨ Prueba completada.")
    return 0

if __name__ == "__main__":
    sys.exit(main())