"""Utilidades de archivos (sanitización de nombres para evitar path traversal)."""

from __future__ import annotations

import os
import re
from pathlib import Path


_SAFE_CHARS_RE = re.compile(r"[^A-Za-z0-9._-]+")


def safe_filename(filename: str, *, default: str = "file", max_length: int = 180) -> str:
    """Convierte un nombre arbitrario a un nombre seguro para filesystem.

    - Elimina directorios (solo deja el basename).
    - Reemplaza caracteres raros por '_' y recorta a max_length.
    - Mantiene la extensión si existe.
    """
    raw = str(filename or "")
    raw = raw.replace("\x00", "")

    base = Path(raw).name  # quita cualquier ruta (../, C:\, etc)
    stem, ext = os.path.splitext(base)

    stem = _SAFE_CHARS_RE.sub("_", stem).strip("._-")
    ext = _SAFE_CHARS_RE.sub("", ext)

    if not stem:
        stem = default

    out = f"{stem}{ext}"
    if len(out) > max_length:
        # recorta preservando extensión
        if ext and len(ext) < max_length:
            out = f"{stem[: max_length - len(ext)]}{ext}"
        else:
            out = out[:max_length]
    return out
