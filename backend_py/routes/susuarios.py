from fastapi import APIRouter, Depends, HTTPException
from passlib.context import CryptContext
import uuid
from dependencies import require_admin
from models.susuario import create_usuario_sistema

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.post("", status_code=201, dependencies=[Depends(require_admin)])
async def crear_usuario_sistema_endpoint(body: dict, current_admin: dict = Depends(require_admin)):
    username = body.get("username")
    password = body.get("password")
    if not username or not password:
        raise HTTPException(status_code=400, detail="username y password requeridos")
    try:
        hashed = pwd_context.hash(password)
        new_id = str(uuid.uuid4())
        await create_usuario_sistema({
            "id": new_id,
            "username": username,
            "password_hash": hashed,
            "rol": body.get("rol", "gestor"),
            "nombre": body.get("nombre"),
            "email": body.get("email"),
            "usuario_id": body.get("usuario_id"),
        })
        return {"id": new_id, "username": username, "rol": body.get("rol", "gestor")}
    except Exception as e:
        if "Duplicate" in str(e):
            raise HTTPException(status_code=409, detail="Usuario ya existe")
        raise HTTPException(status_code=500, detail=str(e))