"""Convierte tipos de Python no serializables (date, datetime, Decimal) a tipos JSON-safe."""
from datetime import date, datetime
from decimal import Decimal


def serialize(obj):
    """Convierte recursivamente un dict/list con tipos MySQL a tipos serializables."""
    if isinstance(obj, list):
        return [serialize(item) for item in obj]
    if isinstance(obj, dict):
        return {k: serialize(v) for k, v in obj.items()}
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, date):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    return obj
