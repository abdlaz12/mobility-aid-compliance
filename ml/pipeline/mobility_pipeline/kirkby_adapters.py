"""The places to connect the real models. Each class below satisfies an interface in `interfaces.py`.

They are intentionally NOT filled in: the real input format, class order and embedding size of Kirkby's models are open
questions (docs/pipeline.md). Fill in `load` and the method once they are answered, then start with MODELS=real.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np

from .types import Frame, PersonCloud

_TODO = "Not connected yet. See docs/pipeline.md, open questions. Put the weights under MODELS_DIR and implement {what}."


class LearnedSegmenter:
    name = "learned-segmenter"

    def __init__(self, weights: Path):
        self.weights = weights

    def segment(self, frame: Frame) -> np.ndarray:
        raise NotImplementedError(_TODO.format(what="segment()"))


class Ptv3AidClassifier:
    name = "ptv3-aid"

    def __init__(self, weights: Path):
        self.weights = weights

    def classify(self, person: PersonCloud) -> tuple[str, float]:
        raise NotImplementedError(_TODO.format(what="classify()"))


class ReId3DEmbedder:
    name = "reid3d"

    def __init__(self, weights: Path):
        self.weights = weights

    def embed(self, person: PersonCloud) -> np.ndarray:
        raise NotImplementedError(_TODO.format(what="embed()"))
