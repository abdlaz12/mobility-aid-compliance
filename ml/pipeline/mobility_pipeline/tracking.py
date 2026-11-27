from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field

import numpy as np

from .types import Observation


@dataclass
class _Track:
    id: str
    centroid: np.ndarray
    last_seen: float
    last_emit: float = float("-inf")
    history: deque = field(default_factory=lambda: deque(maxlen=5))


class Tracker:
    """Nearest-centroid tracking with smoothing. Keeps `person_track_id` stable and stops a single bad frame from
    flipping the aid label or the identity (a flicker would raise false alerts)."""

    def __init__(self, max_distance: float, timeout_s: float, window: int, emit_every_s: float):
        self.max_distance, self.timeout_s, self.window, self.emit_every_s = max_distance, timeout_s, window, emit_every_s
        self.tracks: list[_Track] = []
        self._next = 1

    def update(self, observations: list[Observation], now: float) -> list[tuple[str, Observation, bool]]:
        """Returns (track_id, smoothed observation, due) per person. `due` is True when an event should be sent."""
        self.tracks = [t for t in self.tracks if now - t.last_seen <= self.timeout_s]
        taken: set[str] = set()
        out = []
        for obs in observations:
            best, best_d = None, self.max_distance
            for t in self.tracks:
                d = float(np.linalg.norm(t.centroid - obs.centroid))
                if t.id not in taken and d <= best_d:
                    best, best_d = t, d
            if best is None:
                best = _Track(id=f"t-{self._next}", centroid=obs.centroid, last_seen=now, history=deque(maxlen=self.window))
                self._next += 1
                self.tracks.append(best)
            taken.add(best.id)
            best.centroid, best.last_seen = obs.centroid, now
            best.history.append(obs)
            due = now - best.last_emit >= self.emit_every_s
            if due:
                best.last_emit = now
            out.append((best.id, self._smooth(best.history, obs), due))
        return out

    @staticmethod
    def _smooth(history, latest: Observation) -> Observation:
        aid = Counter(o.aid_label for o in history).most_common(1)[0][0]
        who = Counter(o.patient_code for o in history).most_common(1)[0][0]
        aid_conf = float(np.mean([o.aid_confidence for o in history if o.aid_label == aid]))
        id_conf = float(np.mean([o.identity_confidence for o in history if o.patient_code == who]))
        return Observation(latest.centroid, aid, aid_conf, who, id_conf)
