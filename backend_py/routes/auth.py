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
pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt_sha256", "bcrypt"], deprecated="auto")

# ─── FORZAR JWT_SECRET desde entorno (sin valor por defecto inseguro) ───
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET no está definido en el entorno. "
        "El sistema no puede arrancar de forma segura. "
        "Asigna un valor (ej: openssl rand -hex 32) y reinicia."
    )

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
    Mensajes de error unificados para evitar enumeración de usuarios.
    """
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="username y password son requeridos."
        )

    user = await get_by_username(username)

    # Si el usuario no existe, respondemos igual que si la contraseña fuera incorrecta
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas."
        )

    # Verificar estado activo (pero sin diferenciar en el mensaje)
    # Si está inactivo, también respondemos "credenciales incorrectas"
    if not user.get("activo"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas."
        )

    try:
        verified = pwd_context.verify(password, user["password_hash"])
    except ValueError as e:
        msg = str(e)
        # Manejo del límite de 72 bytes en bcrypt
        if "72" in msg or "truncate" in msg or "longer than" in msg:
            verified = pwd_context.verify(password[:72], user["password_hash"])
        else:
            raise

    if not verified:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas."
        )

    # Actualizar último acceso
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


@router.post("/setup", status_code=status.HTTP_201_CREATED)
async def setup_admin(body: dict):
    """
    Crea el primer usuario admin si la tabla está vacía.
    Solo funciona cuando NO existe ningún usuario del sistema.
    Ahora exige una contraseña segura (mínimo 8 caracteres) en lugar de usar
    una por defecto. Esto evita credenciales conocidas en instalaciones nuevas.
    """
    total = await count_usuarios_sistema()
    if total > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existen usuarios en el sistema. Usa la sección de Administración para crear más."
        )

    username = (body.get("username") or "").strip()
    password = body.get("password", "").strip()
    nombre = body.get("nombre") or "Administrador"
    email = body.get("email") or "admin@empresa.com"

    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de usuario es requerido."
        )
    if not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes proporcionar una contraseña para el usuario administrador."
        )
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña debe tener al menos 8 caracteres."
        )

    try:
        hashed = pwd_context.hash(password)
    except ValueError as e:
        msg = str(e)
        if "72" in msg or "truncate" in msg or "longer than" in msg:
            hashed = pwd_context.hash(password[:72])
        else:
            raise

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