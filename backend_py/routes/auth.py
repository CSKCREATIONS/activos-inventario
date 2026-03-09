import os
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext

from models.susuario import (
    get_by_username,
    update_ultimo_acceso,
    create_usuario_sistema,
    count_usuarios_sistema,
)

router = APIRouter()
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_SECRET = os.getenv("JWT_SECRET", "changeme_in_production_please_use_env")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "8"))


# ─── Helpers ──────────────────────────────────────────────

def _create_token(payload: dict) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    return jwt.encode({**payload, "exp": expire}, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ─── Dependencia para rutas protegidas ────────────────────

async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    payload = _decode_token(creds.credentials)
    return payload


# ─── Endpoints ────────────────────────────────────────────

@router.post("/login")
async def login(body: dict):
    """
    Recibe { username, password } y retorna un JWT Bearer token.
    """
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""

    if not username or not password:
        raise HTTPException(status_code=400, detail="username y password son requeridos.")

    user = await get_by_username(username)

    if not user:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas.")

    if not user.get("activo"):
        raise HTTPException(status_code=403, detail="Usuario inactivo. Contacta al administrador.")

    if not pwd_context.verify(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas.")

    await update_ultimo_acceso(user["id"])

    token = _create_token({
        "sub": user["id"],
        "username": user["username"],
        "rol": user["rol"],
        "nombre": user.get("nombre") or user["username"],
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "rol": user["rol"],
            "nombre": user.get("nombre") or user["username"],
            "email": user.get("email"),
        },
    }


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    """Devuelve los datos del usuario autenticado (extraídos del token)."""
    return {"user": current_user}


@router.post("/setup", status_code=201)
async def setup_admin(body: dict):
    """
    Crea el primer usuario admin si la tabla está vacía.
    Solo funciona cuando NO existe ningún usuario del sistema.
    """
    total = await count_usuarios_sistema()
    if total > 0:
        raise HTTPException(
            status_code=409,
            detail="Ya existen usuarios en el sistema. Usa la sección de Administración para crear más.",
        )

    username = (body.get("username") or "admin").strip()
    password = body.get("password") or "admin123"
    nombre = body.get("nombre") or "Administrador"
    email = body.get("email") or "admin@empresa.com"

    hashed = pwd_context.hash(password)
    await create_usuario_sistema({
        "id": str(uuid.uuid4()),
        "username": username,
        "password_hash": hashed,
        "rol": "admin",
        "nombre": nombre,
        "email": email,
        "usuario_id": None,
    })

    return {"message": f"Usuario '{username}' creado correctamente. Ya puedes iniciar sesión."}
