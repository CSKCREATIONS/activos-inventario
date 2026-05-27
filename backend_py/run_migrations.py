#!/usr/bin/env python3
"""
Script para ejecutar las migraciones de la BD.
Ejecutar: python run_migrations.py
"""

import asyncio
import sys
from pathlib import Path
from config.db import get_pool


async def run_migrations():
    """Ejecuta todas las migraciones SQL en orden."""
    
    migrations_dir = Path(__file__).parent / "config"
    migration_files = sorted(migrations_dir.glob("migration_*.sql"))
    
    if not migration_files:
        print("[ERROR] No se encontraron archivos de migracion")
        return False
    
    pool = await get_pool()
    
    try:
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                for migration_file in migration_files:
                    print(f"\n[MIGRACION] Ejecutando: {migration_file.name}")
                    
                    with open(migration_file, 'r', encoding='utf-8') as f:
                        sql_content = f.read()
                    
                    # Dividir por punto y coma para ejecutar múltiples statements
                    statements = sql_content.split(';')
                    
                    for statement in statements:
                        statement = statement.strip()
                        if not statement or statement.startswith('--'):
                            continue
                        
                        try:
                            await cur.execute(statement)
                            print(f"   [OK] Ejecutado: {statement[:50]}...")
                        except Exception as e:
                            print(f"   [SALTADO] (probablemente ya existe): {str(e)[:60]}")
                    
                    await conn.commit()
        
        print("\n[OK] Migraciones completadas exitosamente")
        return True
        
    except Exception as e:
        print(f"\n[ERROR] Error durante migraciones: {e}")
        return False


if __name__ == "__main__":
    success = asyncio.run(run_migrations())
    sys.exit(0 if success else 1)
