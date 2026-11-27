from __future__ import annotations

import logging
from pathlib import Path

import numpy as np

from .gallery import Gallery
from .interfaces import AidClassifier, ReIDEmbedder, Segmenter
from .publisher import build_event
from .tracking import Tracker
from .types import Config, Frame, Observation, PersonCloud

log = logging.getLogger("mobility_pipeline")


def build_models(cfg: Config) -> tuple[Segmenter, AidClassifier, ReIDEmbedder]:
    """Choose the models. MODELS=stub runs the stand-ins; MODELS=real loads the adapters from MODELS_DIR."""
    if cfg.models == "stub":
        from .stubs import GridSegmenter, HeightAidClassifier, ShapeEmbedder
        return GridSegmenter(), HeightAidClassifier(), ShapeEmbedder()
    from .kirkby_adapters import LearnedSegmenter, Ptv3AidClassifier, ReId3DEmbedder
    root = Path(cfg.models_dir)
    return LearnedSegmenter(root / "segmentation"), Ptv3AidClassifier(root / "aid_classifier"), ReId3DEmbedder(root / "reid")


def mask_people(frame: Frame, labels: np.ndarray, min_points: int) -> list[PersonCloud]:
    """Step 3. Cut the frame into one cloud per person. Clusters with too few points are noise, not people."""
    people = []
    for label in sorted(int(x) for x in np.unique(labels) if x >= 0):
        pts = frame.points[labels == label]
        if len(pts) >= min_points:
            people.append(PersonCloud(points=pts, label=label))
    return people


class Pipeline:
    def __init__(self, cfg: Config, segmenter: Segmenter, aid: AidClassifier, reid: ReIDEmbedder, gallery: Gallery):
        self.cfg, self.segmenter, self.aid, self.reid, self.gallery = cfg, segmenter, aid, reid, gallery
        self.tracker = Tracker(cfg.track_max_distance, cfg.track_timeout_s, cfg.smooth_window, cfg.emit_every_s)

    def observe(self, frame: Frame) -> list[Observation]:
        labels = self.segmenter.segment(frame)
        out = []
        for person in mask_people(frame, labels, self.cfg.min_points):
            try:  # one failing person must not stop the others
                aid_label, aid_conf = self.aid.classify(person)
                code, id_conf = self.gallery.match(self.reid.embed(person), self.cfg.unknown_below)
            except Exception:  # noqa: BLE001
                log.exception("model failed on one person; skipped for this frame")
                continue
            out.append(Observation(person.centroid, aid_label, aid_conf, code, id_conf))
        return out

    def process(self, frame: Frame, now: float) -> list[dict]:
        """Frame in, events out (only those that are due for sending)."""
        events = []
        for track_id, obs, due in self.tracker.update(self.observe(frame), now):
            if due:
                events.append(build_event(obs, track_id, frame.room_id, frame.timestamp, self.cfg.model_version))
        return events
