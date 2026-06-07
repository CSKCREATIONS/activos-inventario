import asyncio
import os
import sys

sys.path.append(os.getcwd())

from models.asignacion import AsignacionModel
# ✅ CORREGIDO: antes importaba '_normalize_accesorios' que ya no existe.
#    La función se renombró a 'normalizar_accesorios_entregados' y se movió
#    a utils/accesorios.py
from utils.accesorios import normalizar_accesorios_entregados
from routes.asignaciones import _generar_y_registrar_acta


async def main():
    if len(sys.argv) < 2:
        print('Uso: python scripts/regenerate_acta.py <asignacion_id>')
        return
    asignacion_id = sys.argv[1]

    asignacion = await AsignacionModel.find_by_id(asignacion_id)
    if not asignacion:
        print('Asignación no encontrada:', asignacion_id)
        return

    # ✅ CORREGIDO: usar la función correcta del módulo correcto
    accesorios = normalizar_accesorios_entregados(asignacion.get('accesorios_entregados'))

    try:
        pdf_bytes, filename, url = await _generar_y_registrar_acta(
            asignacion,
            accesorios_entregados=accesorios,
            cargado_por='script',
            rellenar=True,
        )
        print('Acta regenerada:', filename, url)
    except Exception as e:
        print('Error regenerando acta:', e)


if __name__ == '__main__':
    asyncio.run(main())
