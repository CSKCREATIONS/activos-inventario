import asyncio
import os
import sys
sys.path.append(os.getcwd())

from models.asignacion import AsignacionModel

async def main():
    if len(sys.argv) < 2:
        print('Uso: python scripts/test_update_asignacion.py <asignacion_id>')
        return
    asignacion_id = sys.argv[1]
    data = {
        'usuarios_ids': ['u4', 'u3'],
        'accesorios_entregados': [
            {'id': 'e10', 'nombre': 'Monitor', 'placa': 'EAC000620', 'tipo_equipo': 'Monitor'},
            {'id': 'e5', 'nombre': 'Impresora', 'placa': 'EAC000089', 'tipo_equipo': 'Impresora'},
        ],
        'observaciones': 'Prueba de actualización automática',
    }
    try:
        res = await AsignacionModel.update(asignacion_id, data)
        print('Resultado actualización:', res)
    except Exception as e:
        print('Error en prueba:', e)

if __name__ == '__main__':
    asyncio.run(main())
