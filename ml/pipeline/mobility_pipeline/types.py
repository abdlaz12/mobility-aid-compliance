from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

import numpy as np


@dataclass
class Frame:
    """One LiDAR sweep. `points` is N x 4: x, y, z (metres) and intensity."""
    points: np.ndarray
    timestamp: datetime
    room_id: str


@dataclass
class PersonCloud:
    """The points of ONE person, cut out of a frame by masking."""
    points: np.ndarray
    label: int  # the segmentation label this person had in the frame

    @property
    def centroid(self) -> np.ndarray:
        return self.points[:, :3].mean(axis=0)


@dataclass
class Observation:
    """What the models said about one person in one frame."""
    centroid: np.ndarray
    aid_label: str
    aid_confidence: float
    patient_code: str | None
    identity_confidence: float


@dataclass
class Config:
    models_dir: str = "models"
    embeddings_dir: str = "data/embeddings"
    spool_dir: str = "data/spool"
    web_url: str = "http://localhost:3000"
    api_key: str = ""
    models: str = "stub"            # "stub" or "real"
    min_points: int = 30            # a cluster smaller than this is noise, not a person
    unknown_below: float = 0.30     # best match weaker than this is reported as an unknown person
    track_max_distance: float = 1.0  # metres a person may move between frames and keep the same track
    track_timeout_s: float = 5.0
    smooth_window: int = 5          # frames used for the majority vote
    emit_every_s: float = 2.0       # one event per person per this many seconds
    gallery_refresh_s: float = 60.0
    model_version: str = "stub"
    extra: dict = field(default_factory=dict)

    @classmethod
    def from_env(cls, env: dict[str, str] | None = None) -> "Config":
        import os
        e = env if env is not None else os.environ
        return cls(
            models_dir=e.get("MODELS_DIR", "models"), embeddings_dir=e.get("EMBEDDINGS_DIR", "data/embeddings"),
            spool_dir=e.get("SPOOL_DIR", "data/spool"), web_url=e.get("WEB_URL", "http://localhost:3000").rstrip("/"),
            api_key=e.get("INTAKE_API_KEY", ""), models=e.get("MODELS", "stub"),
        )
