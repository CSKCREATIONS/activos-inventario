from fastapi import APIRouter, Depends, HTTPException
from passlib.context import CryptContext
import uuid
from dependencies import require_admin
from models.susuario import create_usuario_sistema

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")



from models.susuario import (
    create_usuario_sistema,
    get_all_usuarios_sistema,
    get_usuario_sistema_by_id,
    update_usuario_sistema,
    delete_usuario_sistema
)

@router.post("", status_code=201, dependencies=[Depends(require_admin)])
async def crear_usuario_sistema_endpoint(
    body: dict,
    current_admin: dict = Depends(require_admin)
):
    username = body.get("username")
    password = body.get("password")
    if not username or not password:
        raise HTTPException(status_code=400, detail="username y password requeridos")
    
    # Validar rol permitido (evitar escalada)
    rol = body.get("rol", "gestor")
    if rol not in ("admin", "gestor"):
        raise HTTPException(status_code=400, detail="Rol debe ser 'admin' o 'gestor'")
    
    try:
        hashed = pwd_context.hash(password)
        new_id = str(uuid.uuid4())
        await create_usuario_sistema({
            "id": new_id,
            "username": username,
            "password_hash": hashed,
            "rol": rol,
            "nombre": body.get("nombre"),
            "email": body.get("email"),
            "usuario_id": body.get("usuario_id"),
        })
        return {
            "id": new_id,
            "username": username,
            "rol": rol,
            "nombre": body.get("nombre"),
            "email": body.get("email"),
        }
    except Exception as e:
        if "Duplicate entry" in str(e) or "1062" in str(e):
            raise HTTPException(status_code=409, detail="El nombre de usuario ya existe")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", dependencies=[Depends(require_admin)])
async def listar_usuarios_sistema(current_admin: dict = Depends(require_admin)):
    users = await get_all_usuarios_sistema()
    return {"data": users}

@router.get("/{user_id}", dependencies=[Depends(require_admin)])
async def obtener_usuario_sistema(user_id: str, current_admin: dict = Depends(require_admin)):
    user = await get_usuario_sistema_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"data": user}

@router.put("/{user_id}", dependencies=[Depends(require_admin)])
async def actualizar_usuario_sistema(user_id: str, body: dict, current_admin: dict = Depends(require_admin)):
    # Validar que no se intente cambiar el rol del propio admin si es el único
    if body.get("rol") and current_admin.get("id") == user_id and body["rol"] != current_admin.get("rol"):
        # Verificar si es el único admin
        users = await get_all_usuarios_sistema()
        admins = [u for u in users if u["rol"] == "admin" and u["activo"]]
        if len(admins) == 1:
            raise HTTPException(status_code=400, detail="No puedes cambiar tu propio rol porque eres el único administrador")
    success = await update_usuario_sistema(user_id, body)
    if not success:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": "Usuario actualizado"}

@router.delete("/{user_id}", dependencies=[Depends(require_admin)])
async def eliminar_usuario_sistema(user_id: str, current_admin: dict = Depends(require_admin)):
    if current_admin.get("id") == user_id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    success = await delete_usuario_sistema(user_id)
    if not success:
        raise HTTPException(status_code=400, detail="No se puede eliminar el único administrador activo")
    return {"message": "Usuario eliminado"}