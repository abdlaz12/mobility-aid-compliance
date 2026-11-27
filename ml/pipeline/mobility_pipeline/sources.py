from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator

import numpy as np

from .types import Frame


def person_blob(rng: np.random.Generator, x: float, y: float, wide: bool = False, n: int = 120) -> np.ndarray:
    """A made-up standing person (a tall thin column of points), optionally with a wide frame in front (a 'walker')."""
    body = np.column_stack([rng.normal(x, 0.12, n), rng.normal(y, 0.12, n), rng.uniform(0.0, 1.7, n), rng.uniform(0, 1, n)])
    if not wide:
        return body
    frame = np.column_stack([rng.uniform(x - 0.5, x + 0.5, n // 2), rng.normal(y + 0.5, 0.05, n // 2), rng.uniform(0.0, 0.9, n // 2), rng.uniform(0, 1, n // 2)])
    return np.vstack([body, frame])


def synthetic(room_id: str = "R-204", frames: int = 20, people: int = 2, seed: int = 1) -> Iterator[Frame]:
    """Frames with 1 to 5 made-up people standing apart. For trying the plumbing; not a test of any model."""
    rng = np.random.default_rng(seed)
    for i in range(frames):
        blobs = [person_blob(rng, 2.5 * k + 0.02 * i, 1.0 + 0.5 * (k % 2), wide=(k == 0)) for k in range(people)]
        yield Frame(np.vstack(blobs), datetime.now(timezone.utc), room_id)


def from_directory(path: str | Path, room_id: str) -> Iterator[Frame]:
    """Frames saved as .npy files of shape N x 4, played in name order."""
    for f in sorted(Path(path).glob("*.npy")):
        pts = np.load(f)
        if pts.ndim != 2 or pts.shape[1] < 4:
            raise ValueError(f"{f.name}: expected N x 4 (x, y, z, intensity), got {pts.shape}")
        yield Frame(pts[:, :4].astype(float), datetime.now(timezone.utc), room_id)
