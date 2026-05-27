import asyncio
import os
import sys

# Asegurar imports locales
sys.path.append(os.getcwd())
from config.db import get_pool

async def main():
    pool = await get_pool()
    sql_path = os.path.join(os.getcwd(), 'config', 'migration_usuarios_multiples.sql')
    with open(sql_path, 'r', encoding='utf-8') as f:
        sql = f.read()

    # Split statements naively by ';' (suficiente para este archivo)
    statements = [s.strip() for s in sql.split(';') if s.strip()]

    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            for stmt in statements:
                print('Ejecutando:', stmt[:120])
                try:
                    await cur.execute(stmt)
                except Exception as e:
                    print('ERROR ejecutando statement:', e)
    print('Migración aplicada (intento).')

if __name__ == '__main__':
    asyncio.run(main())
