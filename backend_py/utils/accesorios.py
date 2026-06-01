"""Utilidades compartidas para formatear accesorios en asignaciones."""

from __future__ import annotations

import json
from typing import Any


_REFERENCIAS_GENERICAS = {
    "accesorio",
    "cargador",
    "celular",
    "cable",
    "desktop",
    "equipo",
    "impresora",
    "laptop",
    "monitor",
    "mouse",
    "router",
    "switch",
    "tablet",
    "teclado",
    "ups",
}


def _normalizar_texto(valor: str) -> str:
    return " ".join(valor.lower().split())


def _es_referencia_generica(referencia: str, valor: dict[str, Any]) -> bool:
    referencia_norm = _normalizar_texto(referencia)
    if not referencia_norm:
        return True

    if referencia_norm in _REFERENCIAS_GENERICAS:
        return True

    for key in ("tipo_equipo", "nombre", "nombre_equipo"):
        texto = valor.get(key)
        if isinstance(texto, str) and _normalizar_texto(texto) == referencia_norm:
            return True

    return False


def formatear_accesorio(valor: Any) -> str:
    """Devuelve el texto visible de un accesorio o equipo.

    Prioridad:
    1. referencia
    2. nombre
    3. nombre_equipo
    4. tipo_equipo + marca + modelo
    5. representación textual final
    """

    if valor is None:
        return ""

    if isinstance(valor, str):
        return valor.strip()

    if isinstance(valor, dict):
        referencia = valor.get("referencia")
        if isinstance(referencia, str):
            referencia = referencia.strip()
            if referencia and not _es_referencia_generica(referencia, valor):
                return referencia

        partes = []
        for key in ("tipo_equipo", "marca", "modelo"):
            texto = valor.get(key)
            if isinstance(texto, str):
                texto = texto.strip()
                if texto:
                    partes.append(texto)

        if partes:
            return " ".join(partes)

        texto = valor.get("nombre")
        if isinstance(texto, str):
            texto = texto.strip()
            if texto:
                return texto

        texto_equipo = valor.get("nombre_equipo")
        if isinstance(texto_equipo, str):
            texto_equipo = texto_equipo.strip()
            if texto_equipo:
                return texto_equipo

    return str(valor).strip()


def normalizar_accesorios_entregados(valor: Any) -> list[str]:
    """Convierte cualquier formato razonable de accesorios a lista de textos."""

    if not valor:
        return []

    if isinstance(valor, str):
        texto = valor.strip()
        if not texto:
            return []

        try:
            parsed = json.loads(texto)
        except json.JSONDecodeError:
            return [item.strip() for item in texto.split(",") if item.strip()]

        return normalizar_accesorios_entregados(parsed)

    if isinstance(valor, list):
        resultado = []
        for item in valor:
            texto = formatear_accesorio(item)
            if texto:
                resultado.append(texto)
        return resultado

    texto = formatear_accesorio(valor)
    if not texto:
        return []

    if "," in texto:
        return [item.strip() for item in texto.split(",") if item.strip()]

    return [texto]