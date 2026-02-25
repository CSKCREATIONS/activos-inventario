# Backend Python - FastAPI

Reescritura completa del backend Node.js/Express en **Python 3.12+ con FastAPI**.

## Estructura

```
backend_py/
├── main.py              # Punto de entrada
├── requirements.txt     # Dependencias
├── .env.example         # Variables de entorno (copiar a .env)
├── config/
│   └── db.py            # Pool de conexión MySQL (aiomysql)
├── models/
│   ├── usuario.py
│   ├── equipo.py
│   ├── asignacion.py
│   ├── accesorio.py
│   ├── documento.py
│   └── susuario.py
├── routes/
│   ├── usuarios.py
│   ├── equipos.py
│   ├── asignaciones.py
│   ├── accesorios.py
│   ├── documentos.py
│   ├── dashboard.py
│   └── susuarios.py
└── uploads/             # Archivos subidos
```

## Instalación

```bash
cd backend_py

# Crear entorno virtual
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # Linux/Mac

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
copy .env.example .env
# Editar .env con tus credenciales MySQL
```

## Ejecutar

```bash
python main.py
# o
uvicorn main:app --host 0.0.0.0 --port 3001 --reload
```

El servidor corre en `http://localhost:3001/api`.  
Documentación interactiva: `http://localhost:3001/docs`

## Endpoints (mismos que el backend Node.js)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET/POST/PUT/DELETE | `/api/usuarios` | CRUD usuarios |
| GET/POST/PUT/DELETE | `/api/equipos` | CRUD equipos |
| GET/POST/PUT | `/api/asignaciones` | CRUD asignaciones |
| POST | `/api/asignaciones/:id/devolucion` | Registrar devolución |
| GET/POST/PUT/DELETE | `/api/accesorios` | CRUD accesorios |
| GET/POST/PUT/DELETE | `/api/documentos` | CRUD documentos |
| GET | `/api/dashboard` | Estadísticas |
| POST | `/api/Susuarios` | Crear usuario sistema |
