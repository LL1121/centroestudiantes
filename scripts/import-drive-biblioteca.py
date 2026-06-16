#!/usr/bin/env python3
"""
Importa libros/archivos desde Google Drive a la Biblioteca Digital.

Descarga una carpeta o archivo público de Drive (link compartido) y sube cada
PDF/EPUB/JPEG/PNG a la biblioteca con la declaración de derechos requerida.

Requisitos:
  pip install gdown requests

La carpeta/archivo de Drive debe estar compartido como
「Cualquier persona con el enlace」 (público). Links privados no funcionan sin
OAuth de Google.

Uso básico:
  export BIBLIOTECA_EMAIL=tu@mail.com
  export BIBLIOTECA_PASSWORD=tu-pass
  python3 scripts/import-drive-biblioteca.py \\
    --drive-url 'https://drive.google.com/drive/folders/XXXXX' \\
    --content-kind apunte_propio

Opciones útiles:
  --base-url https://biblioteca.lyntrix.com.ar   (default)
  --carrera "Ingeniería" --tags "libros,2025"
  --dry-run                                      (solo lista, no sube)
  --keep-downloads                               (no borra la carpeta temp)

Desde el server (red Docker, sin pasar por el frontend):
  python3 scripts/import-drive-biblioteca.py \\
    --backend-url http://biblioteca-backend:8000 \\
    --drive-url '...' --content-kind material_docente
"""
from __future__ import annotations

import argparse
import os
import re
import shutil
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ALLOWED_SUFFIXES = {".pdf", ".epub", ".jpg", ".jpeg", ".png"}
MAX_BYTES = 50 * 1024 * 1024
MIME = {
    ".pdf": "application/pdf",
    ".epub": "application/epub+zip",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
}
CONTENT_KINDS = ("apunte_propio", "material_docente", "dominio_publico", "licencia_abierta")
DEFAULT_BASE = "https://biblioteca.lyntrix.com.ar"


def _need_deps() -> tuple[object, object]:
    try:
        import gdown  # type: ignore
        import requests  # type: ignore
    except ImportError:
        print("Instalá dependencias: pip install gdown requests", file=sys.stderr)
        sys.exit(1)
    return gdown, requests


def title_from_filename(name: str) -> str:
    stem = Path(name).stem
    cleaned = re.sub(r"_+", " ", stem).strip()
    return cleaned or name


def download_drive(gdown: object, url: str, dest: Path) -> None:
    """Descarga carpeta o archivo de Drive a `dest`."""
    dest.mkdir(parents=True, exist_ok=True)
    is_folder = "/folders/" in url or "folderview" in url
    if is_folder:
        gdown.download_folder(url, output=str(dest), quiet=False, use_cookies=False)
    else:
        gdown.download(url, output=str(dest / "archivo"), quiet=False, fuzzy=True)


def collect_files(root: Path) -> list[Path]:
    files: list[Path] = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() in ALLOWED_SUFFIXES:
            files.append(path)
    return sorted(files, key=lambda p: p.name.lower())


class BibliotecaClient:
    def __init__(
        self,
        requests_mod: object,
        *,
        base_url: str | None,
        backend_url: str | None,
        email: str,
        password: str,
    ) -> None:
        self._requests = requests_mod
        self._session = requests_mod.Session()
        self._base = (base_url or "").rstrip("/")
        self._backend = (backend_url or "").rstrip("/")
        self._email = email
        self._password = password
        self._use_backend = bool(self._backend)

    def login(self) -> None:
        if self._use_backend:
            resp = self._session.post(
                f"{self._backend}/api/v1/auth/login",
                data={"username": self._email, "password": self._password},
                timeout=60,
            )
            if resp.status_code != 200:
                raise RuntimeError(f"Login falló ({resp.status_code}): {resp.text[:300]}")
            data = resp.json()
            if data.get("requires_2fa"):
                raise RuntimeError("La cuenta tiene 2FA: desactivalo un momento o usá la web.")
            token = data.get("access_token")
            if not token:
                raise RuntimeError("Login sin access_token en la respuesta.")
            self._session.headers["Authorization"] = f"Bearer {token}"
            return

        resp = self._session.post(
            f"{self._base}/api/auth/login",
            json={"email": self._email, "password": self._password},
            timeout=60,
        )
        if resp.status_code != 200:
            raise RuntimeError(f"Login falló ({resp.status_code}): {resp.text[:300]}")
        body = resp.json()
        if body.get("requires_2fa"):
            raise RuntimeError("La cuenta tiene 2FA: desactivalo un momento o usá la web.")
        if not body.get("ok"):
            raise RuntimeError(f"Login rechazado: {body}")

    def upload(
        self,
        path: Path,
        *,
        content_kind: str,
        carrera: str | None,
        tags: str | None,
    ) -> tuple[str, str]:
        """Devuelve (estado, mensaje). estado: ok | dedup | error"""
        if path.stat().st_size > MAX_BYTES:
            return "error", f"supera 50 MB ({path.stat().st_size // (1024*1024)} MB)"

        ext = path.suffix.lower()
        mime = MIME.get(ext, "application/octet-stream")
        titulo = title_from_filename(path.name)

        data = {
            "titulo": titulo,
            "content_kind": content_kind,
            "rights_declaration": "true",
        }
        if carrera:
            data["carrera"] = carrera
        if tags:
            data["tags"] = tags

        upload_url = (
            f"{self._backend}/api/v1/materials/upload"
            if self._use_backend
            else f"{self._base}/api/materials/upload"
        )

        with path.open("rb") as fh:
            resp = self._session.post(
                upload_url,
                data=data,
                files={"file": (path.name, fh, mime)},
                timeout=600,
            )

        if resp.status_code == 201:
            payload = resp.json()
            if payload.get("deduplicated"):
                return "dedup", titulo
            return "ok", titulo
        try:
            detail = resp.json().get("detail", resp.text[:200])
        except Exception:
            detail = resp.text[:200]
        return "error", f"{titulo}: {detail}"


def main() -> int:
    gdown, requests = _need_deps()

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--drive-url", required=True, help="Link público de carpeta o archivo en Drive")
    parser.add_argument(
        "--content-kind",
        required=True,
        choices=CONTENT_KINDS,
        help="Tipo de contenido (declaración de derechos)",
    )
    parser.add_argument("--base-url", default=os.environ.get("BIBLIOTECA_BASE_URL", DEFAULT_BASE))
    parser.add_argument("--backend-url", default=os.environ.get("BIBLIOTECA_BACKEND_URL"))
    parser.add_argument("--email", default=os.environ.get("BIBLIOTECA_EMAIL"))
    parser.add_argument("--password", default=os.environ.get("BIBLIOTECA_PASSWORD"))
    parser.add_argument("--carrera", default=os.environ.get("BIBLIOTECA_CARRERA"))
    parser.add_argument("--tags", default=os.environ.get("BIBLIOTECA_TAGS"))
    parser.add_argument("--concurrency", type=int, default=3, help="Subidas en paralelo (default 3)")
    parser.add_argument("--dry-run", action="store_true", help="Solo listar archivos, no subir")
    parser.add_argument("--keep-downloads", action="store_true", help="No borrar carpeta temporal")
    args = parser.parse_args()

    if not args.backend_url and not args.base_url:
        print("Definí --base-url o --backend-url.", file=sys.stderr)
        return 1

    if not args.dry_run and (not args.email or not args.password):
        print(
            "Credenciales requeridas: --email/--password o BIBLIOTECA_EMAIL/BIBLIOTECA_PASSWORD",
            file=sys.stderr,
        )
        return 1

    tmp = Path(tempfile.mkdtemp(prefix="biblio-drive-"))
    print(f"==> Descargando desde Drive a {tmp} …")
    try:
        download_drive(gdown, args.drive_url, tmp)
    except Exception as exc:
        print(f"Error al descargar Drive: {exc}", file=sys.stderr)
        print(
            "\nTip: la carpeta debe estar compartida como «Cualquier persona con el enlace».",
            file=sys.stderr,
        )
        shutil.rmtree(tmp, ignore_errors=True)
        return 1

    files = collect_files(tmp)
    if not files:
        print("No se encontraron PDF/EPUB/JPEG/PNG en la descarga.", file=sys.stderr)
        if args.keep_downloads:
            print(f"Archivos en: {tmp}")
        else:
            shutil.rmtree(tmp, ignore_errors=True)
        return 1

    print(f"==> {len(files)} archivo(s) listos:")
    for f in files:
        mb = f.stat().st_size / (1024 * 1024)
        print(f"  · {f.name} ({mb:.1f} MB)")

    if args.dry_run:
        if args.keep_downloads:
            print(f"\nDescarga guardada en: {tmp}")
        else:
            shutil.rmtree(tmp, ignore_errors=True)
        return 0

    client = BibliotecaClient(
        requests,
        base_url=None if args.backend_url else args.base_url.rstrip("/"),
        backend_url=args.backend_url,
        email=args.email or "",
        password=args.password or "",
    )

    print("==> Iniciando sesión…")
    try:
        client.login()
    except RuntimeError as exc:
        print(exc, file=sys.stderr)
        if not args.keep_downloads:
            shutil.rmtree(tmp, ignore_errors=True)
        return 1

    print("==> Subiendo…")
    ok = dedup = err = 0
    workers = max(1, min(args.concurrency, 6))

    def _upload_one(p: Path) -> tuple[str, str]:
        return client.upload(
            p,
            content_kind=args.content_kind,
            carrera=args.carrera,
            tags=args.tags,
        )

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(_upload_one, p): p for p in files}
        for i, fut in enumerate(as_completed(futures), 1):
            path = futures[fut]
            try:
                status, msg = fut.result()
            except Exception as exc:
                status, msg = "error", f"{path.name}: {exc}"
            if status == "ok":
                ok += 1
                print(f"  [{i}/{len(files)}] ✓ {msg}")
            elif status == "dedup":
                dedup += 1
                print(f"  [{i}/{len(files)}] ≈ {msg} (ya existía)")
            else:
                err += 1
                print(f"  [{i}/{len(files)}] ✗ {msg}", file=sys.stderr)

    if not args.keep_downloads:
        shutil.rmtree(tmp, ignore_errors=True)
    else:
        print(f"\nDescarga guardada en: {tmp}")

    print(f"\n✓ Listo: {ok} subidos, {dedup} duplicados, {err} errores")
    return 0 if err == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
