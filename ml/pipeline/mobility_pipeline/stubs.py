"""Stand-ins so the whole chain runs without real weights. NONE of these is a real model. Their output is meaningless
and must never be used to judge accuracy; they exist to test the plumbing (masking, tracking, gallery, publishing)."""
from __future__ import annotations

import numpy as np

from .types import Frame, PersonCloud


class GridSegmenter:
    """Connected components on a 0.4 m floor grid: people far enough apart get different labels."""
    name = "stub-grid"

    def __init__(self, cell: float = 0.4):
        self.cell = cell

    def segment(self, frame: Frame) -> np.ndarray:
        pts = frame.points
        cells = np.floor(pts[:, :2] / self.cell).astype(int)
        index: dict[tuple[int, int], list[int]] = {}
        for i, c in enumerate(map(tuple, cells)):
            index.setdefault(c, []).append(i)
        labels = np.full(len(pts), -1, dtype=int)
        seen: set[tuple[int, int]] = set()
        next_label = 0
        for start in index:
            if start in seen:
                continue
            stack, members = [start], []
            seen.add(start)
            while stack:
                cx, cy = stack.pop()
                members.extend(index[(cx, cy)])
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        n = (cx + dx, cy + dy)
                        if n in index and n not in seen:
                            seen.add(n)
                            stack.append(n)
            labels[members] = next_label
            next_label += 1
        return labels


class HeightAidClassifier:
    """Pretends: a wide cloud is a 'walker', a very low one a 'wheelchair', otherwise 'none'."""
    name = "stub-aid"

    def classify(self, person: PersonCloud) -> tuple[str, float]:
        p = person.points[:, :3]
        height = float(p[:, 2].max() - p[:, 2].min())
        width = float(np.ptp(p[:, 0]) + np.ptp(p[:, 1]))
        if height < 1.3:
            return "wheelchair", 0.9
        return ("walker", 0.9) if width > 1.4 else ("none", 0.9)


class ShapeEmbedder:
    """Pretends: an embedding made of simple shape statistics. The same person shape gives a similar vector."""
    name = "stub-reid"
    size = 16

    def embed(self, person: PersonCloud) -> np.ndarray:
        p = person.points[:, :3] - person.points[:, :3].mean(axis=0)
        feats = np.concatenate([p.std(axis=0), np.percentile(p, [5, 25, 50, 75, 95], axis=0).ravel()])
        v = np.resize(feats, self.size).astype(float)
        norm = np.linalg.norm(v)
        return v / norm if norm else v
