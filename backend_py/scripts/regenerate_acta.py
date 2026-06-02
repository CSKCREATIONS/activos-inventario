import asyncio
import os
import sys

sys.path.append(os.getcwd())

from models.asignacion import AsignacionModel
from routes.asignaciones import _normalize_accesorios, _generar_y_registrar_acta


async def main():
    if len(sys.argv) < 2:
        print('Uso: python scripts/regenerate_acta.py <asignacion_id>')
        return
    asignacion_id = sys.argv[1]

    asignacion = await AsignacionModel.find_by_id(asignacion_id)
    if not asignacion:
        print('Asignación no encontrada:', asignacion_id)
        return

    accesorios = _normalize_accesorios(asignacion.get('accesorios_entregados'))

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
