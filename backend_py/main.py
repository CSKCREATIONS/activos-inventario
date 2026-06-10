import os
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import logging

from config.db import test_connection, close_pool
from routes import (
    usuarios, equipos, asignaciones, accesorios,
    documentos, dashboard, susuarios, suministros,
    auth, licencias, importar,
)
from dependencies  import get_current_user
from routes import audit


load_dotenv()

# ─── Logging estructurado (reemplaza print() dispersos) ───────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("itam")

UPLOADS_DIR = os.getenv("UPLOADS_DIR", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await test_connection()
    yield
    await close_pool()


app = FastAPI(title="Inventory System API", version="1.0.0", lifespan=lifespan)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    
    expose_headers=["Content-Disposition"],
)



# ─── Routers ──────────────────────────────────────────────────────────────────
protected = [Depends(get_current_user)]

app.include_router(usuarios.router,     prefix="/api/usuarios",     tags=["Usuarios"],        dependencies=protected)
app.include_router(equipos.router,      prefix="/api/equipos",      tags=["Equipos"],         dependencies=protected)
app.include_router(asignaciones.router, prefix="/api/asignaciones", tags=["Asignaciones"],    dependencies=protected)
app.include_router(accesorios.router,   prefix="/api/accesorios",   tags=["Accesorios"],      dependencies=protected)
app.include_router(documentos.router,   prefix="/api/documentos",   tags=["Documentos"],      dependencies=protected)
app.include_router(dashboard.router,    prefix="/api/dashboard",    tags=["Dashboard"],       dependencies=protected)
app.include_router(susuarios.router,    prefix="/api/Susuarios",    tags=["UsuariosSistema"], dependencies=protected)
app.include_router(suministros.router,  prefix="/api/suministros",  tags=["Suministros"],     dependencies=protected)
app.include_router(licencias.router,    prefix="/api/licencias",    tags=["Licencias"],       dependencies=protected)
app.include_router(importar.router,     prefix="/api/importar",     tags=["Importar CSV"],    dependencies=protected)
app.include_router(audit.router, prefix="/api/audit", tags=["Auditoría"], dependencies=protected)


# Endpoints públicos: login/token + health
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])


# ─── Health check ─────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    from datetime import datetime, timezone
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


# ─── Error handler global ─────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Error no controlado en %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"message": "Error interno del servidor. Contacta al administrador."},
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
