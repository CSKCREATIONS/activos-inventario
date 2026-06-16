from fastapi import APIRouter, Depends, HTTPException
from models.asignacion import AsignacionModel
from models.usuario import UsuarioModel
from dependencies import get_current_user
import json
from datetime import datetime

router = APIRouter()

@router.post("/asignaciones/{id}/firmar")
async def firmar_asignacion(
    id: str,
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Endpoint simple para registrar una firma en una asignación.
    """
    usuario_id = body.get("usuario_id")
    firma_base64 = body.get("firma")
    
    # Validaciones
    if not usuario_id:
        raise HTTPException(400, detail="usuario_id es requerido")
    if not firma_base64:
        raise HTTPException(400, detail="firma es requerida")
    
    # Buscar asignación
    asignacion = await AsignacionModel.find_by_id(id)
    if not asignacion:
        raise HTTPException(404, detail="Asignación no encontrada")
    
    # Buscar usuario
    usuario = await UsuarioModel.find_by_id(usuario_id)
    if not usuario:
        raise HTTPException(404, detail="Usuario no encontrado")
    
    nombre_usuario = usuario.get("nombre", "Usuario")
    
    # Crear objeto de firma
    nueva_firma = {
        "user_id": usuario_id,
        "nombre": nombre_usuario,
        "signature": firma_base64,
        "fecha": datetime.now().isoformat()
    }
    
    # Obtener firmas existentes
    firmas_existentes = asignacion.get("firmas")
    firmas = []
    if firmas_existentes:
        try:
            if isinstance(firmas_existentes, str):
                firmas = json.loads(firmas_existentes)
            elif isinstance(firmas_existentes, bytes):
                firmas = json.loads(firmas_existentes.decode('utf-8'))
            else:
                firmas = firmas_existentes
        except:
            firmas = []
    
    # Verificar si ya firmó
    for f in firmas:
        if f.get("user_id") == usuario_id:
            raise HTTPException(400, detail="Este usuario ya ha firmado")
    
    # Agregar firma
    firmas.append(nueva_firma)
    
    # Guardar
    await AsignacionModel.update(id, {"firmas": json.dumps(firmas)})
    
    return {
        "message": "Firma registrada correctamente",
        "firmante": nombre_usuario,
        "total_firmas": len(firmas)
    }