from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

import numpy as np

# Same rule as the web system (web/src/lib/patient-input.ts), so a reference can never point outside the folder.
_REF = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$")


def ref_path(embeddings_dir: Path, ref: str) -> Path:
    if not _REF.match(ref) or ".." in ref:
        raise ValueError(f"unsafe embedding reference: {ref!r}")
    root = embeddings_dir.resolve()
    path = (root / f"{ref.replace('/', '__')}.npy").resolve()
    if root not in path.parents:
        raise ValueError(f"unsafe embedding reference: {ref!r}")
    return path


def _unit(v: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(v)
    return v / n if n else v


class Gallery:
    """The embeddings of enrolled patients. Which ones exist is decided by the web system (consent, discharge);
    this class only mirrors that decision and removes files the web system no longer lists."""

    def __init__(self, embeddings_dir: str | Path):
        self.dir = Path(embeddings_dir)
        self.dir.mkdir(parents=True, exist_ok=True)
        self.vectors: dict[str, list[np.ndarray]] = {}
        self.refs: set[str] = set()

    def refresh_from_web(self, web_url: str, api_key: str, timeout: float = 10.0) -> int:
        req = urllib.request.Request(f"{web_url}/api/reid/gallery", headers={"Authorization": f"Bearer {api_key}"})
        with urllib.request.urlopen(req, timeout=timeout) as r:  # noqa: S310 (URL comes from our own config)
            samples = json.load(r)["samples"]
        return self.load(samples)

    def load(self, samples: list[dict]) -> int:
        """`samples` is the list the web system returns. Loads the listed embeddings, then purges every other file."""
        vectors: dict[str, list[np.ndarray]] = {}
        refs: set[str] = set()
        for s in samples:
            try:
                path = ref_path(self.dir, s["embedding_ref"])
            except ValueError:
                continue
            if not path.exists():
                continue
            vectors.setdefault(s["patient_code"], []).append(_unit(np.load(path).astype(float)))
            refs.add(s["embedding_ref"])
        self.vectors, self.refs = vectors, refs
        self.purge_unlisted({s["embedding_ref"] for s in samples})
        return sum(len(v) for v in vectors.values())

    def purge_unlisted(self, listed: set[str]) -> int:
        """Section 7: when consent is withdrawn or a patient is discharged the web system stops listing the sample.
        The embedding file must go too. Returns how many files were deleted."""
        keep = set()
        for ref in listed:
            try:
                keep.add(ref_path(self.dir, ref))
            except ValueError:
                pass
        removed = 0
        for f in self.dir.glob("*.npy"):
            if f.resolve() not in keep:
                f.unlink()
                removed += 1
        return removed

    def match(self, embedding: np.ndarray, unknown_below: float) -> tuple[str | None, float]:
        """Best patient by cosine similarity (best sample per patient). Returns (patient_code or None, confidence 0..1)."""
        if not self.vectors:
            return None, 0.0
        q = _unit(embedding.astype(float))
        best_code, best = None, -1.0
        for code, vecs in self.vectors.items():
            score = max(float(q @ v) for v in vecs)
            if score > best:
                best_code, best = code, score
        confidence = max(0.0, min(1.0, best))
        return (best_code if confidence >= unknown_below else None), confidence
