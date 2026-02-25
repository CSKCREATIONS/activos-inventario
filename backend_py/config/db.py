import os
import aiomysql
from dotenv import load_dotenv

load_dotenv()

_pool: aiomysql.Pool | None = None


async def get_pool() -> aiomysql.Pool:
    global _pool
    if _pool is None:
        _pool = await aiomysql.create_pool(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", 3306)),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            db=os.getenv("DB_NAME", "inventory_system"),
            minsize=1,
            maxsize=10,
            autocommit=True,
            charset="utf8mb4",
            cursorclass=aiomysql.DictCursor,
        )
    return _pool


async def close_pool():
    global _pool
    if _pool is not None:
        _pool.close()
        await _pool.wait_closed()
        _pool = None


async def test_connection():
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT 1")
        print("OK: Conexion a MySQL (XAMPP) establecida correctamente.")
    except Exception as e:
        print(f"ERROR: No se pudo conectar con MySQL: {e}")
        raise
