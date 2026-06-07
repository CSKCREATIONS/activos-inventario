# routes/susuarios.py (versión corregida)

import uuid
from fastapi import APIRouter, Depends, HTTPException
from passlib.context import CryptContext
from models.susuario import create_usuario_sistema
from routes.auth import require_admin

router = APIRouter()
pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt_sha256", "bcrypt"], deprecated="auto")


@router.post("", status_code=201, dependencies=[Depends(require_admin)])
async def crear(body: dict, current_admin: dict = Depends(require_admin)):
    """
    Crea un nuevo usuario del sistema. Solo accesible por administradores.
    """
    username = body.get("username")
    password = body.get("password")

    if not username or not password:
        raise HTTPException(status_code=400, detail="username y password son requeridos.")

    # Validar que el rol solicitado sea válido (admin/gestor) y no permitir escalada
    rol_solicitado = body.get("rol", "gestor")
    if rol_solicitado not in ("admin", "gestor"):
        raise HTTPException(status_code=400, detail="Rol inválido. Debe ser 'admin' o 'gestor'.")

    try:
        hashed = pwd_context.hash(password)
        new_id = str(uuid.uuid4())
        await create_usuario_sistema(
            {
                "id": new_id,
                "username": username,
                "password_hash": hashed,
                "rol": rol_solicitado,
                "nombre": body.get("nombre"),
                "email": body.get("email"),
                "usuario_id": body.get("usuario_id"),
            }
        )
        return {
            "id": new_id,
            "username": username,
            "rol": rol_solicitado,
            "nombre": body.get("nombre"),
            "email": body.get("email"),
        }
    except Exception as e:
        if "Duplicate entry" in str(e) or "1062" in str(e):
            raise HTTPException(status_code=409, detail="Ya existe un usuario con ese username.")
        raise HTTPException(status_code=500, detail=str(e))