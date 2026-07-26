"""Connecteur DVF — étape [2] Collecte (Bronze).

Idempotent : tente de télécharger la vraie source si `DVF_SOURCE_URL` est
défini, sinon copie la fixture. Écrit une copie brute immuable dans bronze/
avec ses métadonnées de run (voir docs/08).
"""
from __future__ import annotations

import gzip
import hashlib
import json
import shutil
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from . import config


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def collect(bronze_dir: Path | None = None) -> dict:
    """Récupère le CSV DVF brut vers bronze/ et renvoie les métadonnées de run."""
    bronze_dir = bronze_dir or config.BRONZE_DIR
    bronze_dir.mkdir(parents=True, exist_ok=True)
    out = bronze_dir / f"dvf_{config.DEPARTEMENT}_{config.MILLESIME}.csv"

    collected_at = datetime.now(timezone.utc).isoformat()
    origin: str

    if config.DVF_SOURCE_URL:
        # Chemin production : téléchargement geo-dvf (csv.gz).
        tmp_gz = bronze_dir / "dvf_raw.csv.gz"
        urllib.request.urlretrieve(config.DVF_SOURCE_URL, tmp_gz)  # noqa: S310
        with gzip.open(tmp_gz, "rb") as fin, out.open("wb") as fout:
            shutil.copyfileobj(fin, fout)
        tmp_gz.unlink(missing_ok=True)
        origin = config.DVF_SOURCE_URL
    else:
        # Chemin hors-ligne : fixture embarquée.
        shutil.copyfile(config.DVF_FIXTURE, out)
        origin = f"fixture:{config.DVF_FIXTURE.name}"

    meta = {
        "step": "collect",
        "source_name": config.SOURCE_NAME,
        "source_owner": config.SOURCE_OWNER,
        "source_license": config.SOURCE_LICENSE,
        "origin": origin,
        "departement": config.DEPARTEMENT,
        "millesime": config.MILLESIME,
        "collected_at": collected_at,
        "bronze_path": str(out),
        "sha256": _sha256(out),
    }
    (bronze_dir / "run_meta.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return meta
