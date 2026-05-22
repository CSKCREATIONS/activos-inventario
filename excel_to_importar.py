"""
Conversor de inventario Excel → CSVs para importar al sistema ITAM.

Columnas EXACTAS del Excel (fila de encabezados):
  0:  USUARIO ASIGNADO          → usuario.nombre
  1:  PROCESO                   → usuario.proceso
  2:  GRUPO ASIGNADO            → usuario.grupo_asignado
  3:  PESO INFORMACION          → equipo.observaciones
  4:  SITIO DE ALMACENAMIENTO   → equipo.observaciones
  5:  CONFIDECIALIAD            → equipo.confidencialidad
  6:  CRITICIDAD DEL ACTIVO     → equipo.criticidad
  7:  AREA                      → usuario.area
  8:  SISTEME OPERATIVO         → equipo.sistema_operativo
  9:  LUGAR DONDE SE ENCUENTRA  → equipo.observaciones
  10: TIPO EQUIPO               → equipo.tipo_equipo
  11: CANTIDAD                  → (referencia, no se importa)
  12: TORRE/PORTATIL/ALL IN ONE → equipo.modelo
  13: PANTALLA                  → equipo.observaciones
  14: CANTIDAD                  → (referencia)
  15: PLACA                     → equipo.placa (Computador - PLACA COMPUTADORES)
  16: CANTIDAD                  → (referencia)
  17: PLACA                     → equipo.placa (Otro Dispositivo)
  18: CANTIDAD                  → (referencia)
  19: PLACA                     → equipo.placa (Otro Dispositivo)

Uso:
  pip install pandas openpyxl
  python excel_to_importar.py "ruta/al/inventario.xlsx"
"""

import sys
import re
from pathlib import Path
import pandas as pd


# ─── Helpers ─────────────────────────────────────────────────────────────────

def norm(s):
    if not isinstance(s, str):
        return ""
    s = s.strip().lower()
    for a, b in [("a","a"),("e","e"),("i","i"),("o","o"),("u","u"),("n","n")]:
        pass
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"[^a-z0-9_]", "", s)
    return s


def vc(cell):
    """Valor limpio de celda: '' si es nan/none/vacío."""
    s = str(cell).strip()
    return "" if s.lower() in ("nan", "none", "") else s


# ─── Cabeceras de salida ──────────────────────────────────────────────────────

EQUIPOS_HEADERS = [
    "placa", "serial", "tipo_equipo", "marca", "modelo",
    "sistema_operativo", "version_so", "ram", "disco",
    "criticidad", "confidencialidad", "estado", "fecha_compra",
    "proveedor", "costo", "es_rentado", "observaciones",
    "procesador", "nombre_equipo",
]

USUARIOS_HEADERS = [
    "nombre", "cargo", "proceso", "grupo_asignado", "area",
    "correo", "ubicacion", "sede", "activo",
]

# Columnas globales: col_index → (destino, campo)
# destino: "usuario" | "equipo" | "obs"
# NOTA: col 0 = ITEM (numero de fila), el resto desplazado +1
GLOBAL_COLS = {
    1:  ("usuario", "nombre"),            # USUARIO ASIGNADO
    2:  ("usuario", "proceso"),           # PROCESO
    3:  ("usuario", "grupo_asignado"),    # GRUPO ASIGNADO = permisos silogtran
    4:  ("obs",     "peso"),              # PESO INFORMACION
    5:  ("obs",     "sitio"),             # SITIO DE ALMACENAMIENTO INFORMACION
    6:  ("equipo",  "confidencialidad"),  # CONFIDECIALIAD
    7:  ("equipo",  "criticidad"),        # CRITICIDAD DEL ACTIVO
    8:  ("usuario", "area"),              # AREA
    9:  ("equipo",  "sistema_operativo"), # SISTEME OPERATIVO
    10: ("obs",     "lugar"),             # LUGAR DONDE SE ENCUENTRA
}

# Bloques de equipo (desplazados +1 por col ITEM)
BLOQUES = [
    # Bloque A: Computador principal
    #   col 11 = TIPO EQUIPO (PORTATIL/ESCRITORIO/ALL IN ONE)
    #   col 13 = PLACA del equipo (cabecera "TORRE/PORTATIL/ALL IN ONE" = tipo, datos = placa)
    #   col 14 = PANTALLA (serial monitor/pantalla → observaciones)
    {"tipo_col": 11, "placa_col": 13, "forma_col": None, "pantalla_col": 14, "tipo_default": None},
    # Bloque B: Segundo computador (segunda PLACA COMPUTADORES, col 17)
    {"tipo_col": None, "placa_col": 17, "forma_col": None, "pantalla_col": None, "tipo_default": "Computador"},
    # Bloque C: Otro dispositivo 1 (col 18 = tipo, col 20 = placa)
    {"tipo_col": 18, "placa_col": 20, "forma_col": None, "pantalla_col": None, "tipo_default": "Otro Dispositivo"},
    # Bloque D: Otro dispositivo 2 (col 21 = tipo, col 23 = placa)
    {"tipo_col": 21, "placa_col": 23, "forma_col": None, "pantalla_col": None, "tipo_default": "Otro Dispositivo"},
]


# ─── Lectura del Excel ────────────────────────────────────────────────────────

# Palabras clave para detectar cuándo una fila ES encabezado (se filtra como dato)
HEADER_KEYWORDS = {
    "usuario_asignado", "usuario asignado", "proceso", "grupo_asignado",
    "criticidad", "confidecialiad", "confidencialidad", "sisteme_operativo",
    "sistema_operativo", "tipo_equipo", "tipo equipo", "placa_computadores",
    "otros_dispositivos", "lugar_donde_se_encuentra", "peso_informacion",
    "sitio_de_almacenamiento", "item",
}


def es_fila_encabezado(row_cells: list) -> bool:
    """Devuelve True si la fila parece un encabezado (contiene marcadores conocidos)."""
    normed = [norm(str(c)) for c in row_cells]
    raw    = [str(c).strip().lower() for c in row_cells]
    for kw in HEADER_KEYWORDS:
        kw_norm = norm(kw)
        if kw_norm in normed or kw in raw:
            return True
        # Búsqueda parcial
        if any(kw_norm in n for n in normed if len(n) > 3):
            return True
    return False


def leer_excel(path):
    df_raw = pd.read_excel(str(path), header=None, dtype=str).fillna("")
    header_row = None

    for ri in range(min(15, len(df_raw))):
        row_cells = df_raw.iloc[ri].tolist()
        if es_fila_encabezado(row_cells):
            header_row = ri
            # Si la fila anterior TAMBIÉN es encabezado (grupos), preferir la más baja
            # Seguir buscando hasta encontrar la última fila de encabezado consecutiva
            while header_row + 1 < min(15, len(df_raw)):
                next_cells = df_raw.iloc[header_row + 1].tolist()
                if es_fila_encabezado(next_cells):
                    header_row += 1
                else:
                    break
            break

    if header_row is None:
        print("Advertencia: no se detectaron filas de encabezado en las primeras 5 filas.")
        print("Se procesaran todas las filas como datos.")
        header_row = -1
    else:
        print(f"\nEncabezados detectados hasta fila {header_row + 1}. Datos desde fila {header_row + 2}.")
        print("Columnas de la fila de encabezado:")
        for i, c in enumerate(df_raw.iloc[header_row]):
            cs = str(c).strip()
            if cs and cs.lower() not in ("nan", "none"):
                print(f"  [{i:02d}] {cs!r}")

    return df_raw.iloc[header_row + 1:].reset_index(drop=True)


# ─── Procesamiento ────────────────────────────────────────────────────────────

def procesar(path):
    data = leer_excel(path)
    ncols = len(data.columns)
    rows_u, rows_e, rows_a = [], [], []

    for ri in range(len(data)):
        row = data.iloc[ri]
        if all(vc(row.iloc[i]) == "" for i in range(min(ncols, 20))):
            continue

        usr = {h: "" for h in USUARIOS_HEADERS}
        shared = {h: "" for h in EQUIPOS_HEADERS}
        obs = []

        for ci, (dest, campo) in GLOBAL_COLS.items():
            if ci >= ncols:
                continue
            val = vc(row.iloc[ci])
            if not val:
                continue
            if dest == "usuario" and campo in usr:
                usr[campo] = val
            elif dest == "equipo" and campo in shared:
                shared[campo] = val
            elif dest == "obs":
                obs.append(f"{campo}: {val}")

        shared["observaciones"] = " | ".join(obs)

        # Filtrar filas que son encabezados que se colaron como datos
        nombre_norm = norm(usr["nombre"])
        if nombre_norm in ("usuario_asignado", "nombre", "usuario", "item", ""):
            continue
        # Filtrar filas donde col 0 tiene solo un numero (es el ITEM, pero col 1 esta vacia)
        if not usr["nombre"]:
            continue
        rows_u.append(dict(usr))

        for blk in BLOQUES:
            eq = dict(shared)

            # tipo_equipo
            tipo = ""
            if blk["tipo_col"] is not None and blk["tipo_col"] < ncols:
                tipo = vc(row.iloc[blk["tipo_col"]])
            if not tipo and blk["tipo_default"]:
                tipo = blk["tipo_default"]
            eq["tipo_equipo"] = tipo

            # placa
            if blk["placa_col"] is not None and blk["placa_col"] < ncols:
                eq["placa"] = vc(row.iloc[blk["placa_col"]])

            # modelo (forma)
            if blk["forma_col"] is not None and blk["forma_col"] < ncols:
                forma = vc(row.iloc[blk["forma_col"]])
                if forma:
                    eq["modelo"] = forma

            # pantalla → observaciones
            if blk["pantalla_col"] is not None and blk["pantalla_col"] < ncols:
                pant = vc(row.iloc[blk["pantalla_col"]])
                if pant:
                    eq["observaciones"] = (eq["observaciones"] + f" | pantalla: {pant}").lstrip(" | ")

            # Agregar solo si tiene placa O tipo definido (no default genérico)
            has_placa = bool(eq.get("placa"))
            has_tipo = bool(tipo) and tipo not in ("Computador", "Otro Dispositivo")
            if has_placa:
                rows_e.append(eq)
            elif has_tipo:
                # Sin placa → va a accesorios (nombre = tipo_equipo)
                rows_a.append({
                    "nombre":       tipo,
                    "placa":        "",
                    "serial":       "",
                    "cantidad":     "1",
                    "estado":       "Disponible",
                    "observaciones": f"usuario: {usr.get('nombre','')} | area: {usr.get('area','')}",
                })

    return rows_u, rows_e, rows_a


# ─── Main ─────────────────────────────────────────────────────────────────────

def main(path_in):
    p = Path(path_in)
    if not p.exists():
        for ext in (".xlsx", ".xls", ".xlsm"):
            c = p.with_suffix(ext)
            if c.exists():
                p = c
                print(f"Encontrado: {p.name}")
                break
        else:
            print(f"Archivo no encontrado: {p}")
            print("Prueba con la extension completa, por ejemplo:")
            print(f'  python excel_to_importar.py "{p}.xlsx"')
            return

    print(f"Procesando: {p.name}")
    rows_u, rows_e, rows_a = procesar(p)
    print()
    print()

    if rows_u:
        out = p.with_name(p.stem + "_usuarios.csv")
        pd.DataFrame(rows_u, columns=USUARIOS_HEADERS).to_csv(str(out), index=False, encoding="utf-8-sig")
        print(f"Usuarios  -> {out.name}  ({len(rows_u)} filas)")
        print(f"   Primeras filas: nombre='{rows_u[0]['nombre']}' | area='{rows_u[0]['area']}' | proceso='{rows_u[0]['proceso']}'")
        if len(rows_u) > 1:
            print(f"                  nombre='{rows_u[1]['nombre']}' | area='{rows_u[1]['area']}'")
    else:
        print("Sin usuarios detectados (columna USUARIO ASIGNADO no encontrada o vacia).")

    if rows_e:
        out = p.with_name(p.stem + "_equipos.csv")
        pd.DataFrame(rows_e, columns=EQUIPOS_HEADERS).to_csv(str(out), index=False, encoding="utf-8-sig")
        print(f"Equipos   -> {out.name}  ({len(rows_e)} filas)")
        print(f"   Primeras filas: tipo='{rows_e[0]['tipo_equipo']}' | placa='{rows_e[0]['placa']}' | modelo='{rows_e[0]['modelo']}'")
        if len(rows_e) > 1:
            print(f"                  tipo='{rows_e[1]['tipo_equipo']}' | placa='{rows_e[1]['placa']}'")
    else:
        print("Sin equipos detectados.")

    if rows_a:
        ACCESORIOS_HEADERS = ["nombre","placa","serial","cantidad","estado","observaciones"]
        out = p.with_name(p.stem + "_accesorios.csv")
        pd.DataFrame(rows_a, columns=ACCESORIOS_HEADERS).to_csv(str(out), index=False, encoding="utf-8-sig")
        print(f"Accesorios-> {out.name}  ({len(rows_a)} filas)  [sin placa, ej: ADAPTADOR RED]")

    print("\nListo. Sube los .csv desde el menu Importar CSV del sistema.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python excel_to_importar.py ruta/inventario.xlsx")
    else:
        main(sys.argv[1])
