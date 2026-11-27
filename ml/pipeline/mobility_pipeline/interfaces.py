"""The three places where a model plugs in. Write a class with these methods and name it in `build_models`."""
from __future__ import annotations

from typing import Protocol

import numpy as np

from .types import Frame, PersonCloud


class Segmenter(Protocol):
    name: str

    def segment(self, frame: Frame) -> np.ndarray:
        """One integer label per point of `frame.points`. -1 means background or noise; 0, 1, 2... are people."""


class AidClassifier(Protocol):
    name: str

    def classify(self, person: PersonCloud) -> tuple[str, float]:
        """(label, confidence in 0..1) for ONE person. Labels: none, cane, crutches, walker, wheelchair."""


class ReIDEmbedder(Protocol):
    name: str

    def embed(self, person: PersonCloud) -> np.ndarray:
        """A 1-D embedding vector for ONE person. The gallery compares vectors with cosine similarity."""
