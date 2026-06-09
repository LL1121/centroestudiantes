#!/usr/bin/env python3
"""
Recuperación de materiales de la Biblioteca Digital SOLO por HTTP.

Pensado para cuando NO hay acceso a Docker ni sudo en el server: usa la API
pública (catálogo + descarga de archivos) para bajar todos los documentos y su
metadata a una carpeta local.

Qué recupera:
  - Los archivos subidos (PDF / EPUB / JPEG / PNG).
  - La metadata de cada material (título, autor, carrera, tags, etc.) en JSON.

Qué NO puede recuperar (necesita la Opción A con acceso a la DB):
  - Usuarios y contraseñas, historial de chat, embeddings (regenerables).

Uso:
  python3 scripts/recover-materials-http.py
  python3 scripts/recover-materials-http.py --base-url http://localhost:3005
  python3 scripts/recover-materials-http.py --out ./mi-backup

Sin dependencias externas (solo la librería estándar).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

DEFAULT_BASE_URL = "https://biblioteca.ies9018malargue.edu.ar"
PAGE_LIMIT = 100  # tope del endpoint público
EXT_BY_TIPO = {"pdf": "pdf", "epub": "epub", "jpeg": "jpg", "png": "png"}


def _get_json(url: str) -> object:
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _safe_name(name: str) -> str:
    cleaned = re.sub(r"[^\w\-. ]+", "_", name, flags=re.UNICODE).strip()
    return (cleaned or "material")[:120]


def fetch_catalog(base_url: str) -> list[dict]:
    """Trae el catálogo. El endpoint topa en 100; intentamos cubrir más por carrera."""
    seen: dict[str, dict] = {}

    base_list = _get_json(f"{base_url}/api/materials?limit={PAGE_LIMIT}&semantic=false")
    if isinstance(base_list, list):
        for m in base_list:
            seen[m["id"]] = m

    # Si llegamos al tope, intentamos ampliar filtrando por cada carrera conocida.
    if len(seen) >= PAGE_LIMIT:
        carreras = {
            (m.get("carrera") or "").strip() for m in seen.values() if m.get("carrera")
        }
        for carrera in sorted(carreras):
            q = urllib.parse.quote(carrera)
            try:
                extra = _get_json(
                    f"{base_url}/api/materials?carrera={q}&limit={PAGE_LIMIT}&semantic=false"
                )
            except urllib.error.URLError:
                continue
            if isinstance(extra, list):
                for m in extra:
                    seen[m["id"]] = m
        print(
            f"  ! El catálogo llegó al tope de {PAGE_LIMIT}. "
            "Verificá manualmente que no falten materiales.",
            file=sys.stderr,
        )

    return list(seen.values())


def download_file(base_url: str, material: dict, dest_dir: Path) -> bool:
    mid = material["id"]
    tipo = material.get("tipo_archivo", "")
    ext = EXT_BY_TIPO.get(tipo, "bin")
    titulo = _safe_name(material.get("titulo") or mid)
    filename = f"{titulo}__{mid}.{ext}"
    target = dest_dir / filename
    if target.exists():
        return True

    url = f"{base_url}/api/materials/{mid}/file"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=300) as resp, open(target, "wb") as fh:
            while True:
                chunk = resp.read(1024 * 256)
                if not chunk:
                    break
                fh.write(chunk)
        return True
    except urllib.error.HTTPError as exc:
        print(f"  x {titulo} ({mid}): HTTP {exc.code}", file=sys.stderr)
    except urllib.error.URLError as exc:
        print(f"  x {titulo} ({mid}): {exc.reason}", file=sys.stderr)
    if target.exists():
        target.unlink(missing_ok=True)
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="URL base del sitio")
    parser.add_argument("--out", default="backups/materiales-http", help="Carpeta de salida")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    out_dir = Path(args.out)
    files_dir = out_dir / "archivos"
    files_dir.mkdir(parents=True, exist_ok=True)

    print(f"==> Leyendo catálogo de {base_url} …")
    try:
        catalog = fetch_catalog(base_url)
    except urllib.error.URLError as exc:
        print(f"No pude conectar con {base_url}: {exc.reason}", file=sys.stderr)
        return 1

    if not catalog:
        print("No se encontraron materiales en el catálogo.", file=sys.stderr)
        return 1

    (out_dir / "materiales.json").write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"==> {len(catalog)} materiales. Descargando archivos…")

    ok = 0
    for i, material in enumerate(catalog, 1):
        titulo = material.get("titulo") or material["id"]
        print(f"  [{i}/{len(catalog)}] {titulo}")
        if download_file(base_url, material, files_dir):
            ok += 1

    print()
    print(f"✓ Listo: {ok}/{len(catalog)} archivos en {files_dir}")
    print(f"  Metadata completa en {out_dir / 'materiales.json'}")
    if ok < len(catalog):
        print("  ! Algunos archivos fallaron (ver mensajes de arriba).", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
