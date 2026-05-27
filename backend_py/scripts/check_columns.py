import asyncio
import os
import sys

# Asegurar que el directorio actual (backend_py) esté en sys.path
sys.path.append(os.getcwd())

from config.db import get_pool

async def main():
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SHOW COLUMNS FROM asignaciones")
            rows = await cur.fetchall()
            print("COLUMNS:")
            for r in rows:
                print(r)

if __name__ == '__main__':
    asyncio.run(main())
