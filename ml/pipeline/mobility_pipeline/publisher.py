from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

from .types import Observation

REQUIRED = {"event_id", "timestamp", "room_id", "person_track_id", "identity", "aid", "event_type"}


def build_event(obs: Observation, track_id: str, room_id: str, when: datetime, model_version: str) -> dict:
    """An event as in contracts/detection-event.schema.json. Contains no points and no embeddings."""
    return {
        "event_id": str(uuid.uuid4()),
        "timestamp": when.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "room_id": room_id,
        "person_track_id": track_id,
        "identity": {"patient_id": obs.patient_code, "confidence": round(obs.identity_confidence, 4)},
        "aid": {"label": obs.aid_label, "confidence": round(obs.aid_confidence, 4)},
        "event_type": "detection",
        "model_version": model_version[:64],
    }


class Publisher:
    def __init__(self, web_url: str, api_key: str, spool_dir: str | Path, retries: int = 3, timeout: float = 5.0):
        self.url, self.key, self.retries, self.timeout = f"{web_url}/api/detections", api_key, retries, timeout
        self.spool = Path(spool_dir)
        self.spool.mkdir(parents=True, exist_ok=True)

    def _post(self, event: dict) -> int:
        req = urllib.request.Request(self.url, data=json.dumps(event).encode(), method="POST",
                                     headers={"Content-Type": "application/json", "Authorization": f"Bearer {self.key}"})
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as r:  # noqa: S310
                return r.status
        except urllib.error.HTTPError as e:
            return e.code

    def send(self, event: dict) -> str:
        """'sent', 'rejected' (4xx: retrying cannot help) or 'spooled' (web system unreachable or 5xx)."""
        for attempt in range(self.retries):
            try:
                status = self._post(event)
            except OSError:
                status = 0
            if status in (200, 201):
                return "sent"
            if 400 <= status < 500:
                return "rejected"
            time.sleep(min(2 ** attempt * 0.2, 2.0))
        (self.spool / f"{event['event_id']}.json").write_text(json.dumps(event))
        return "spooled"

    def flush_spool(self) -> int:
        """Send what was kept while the web system was away. Returns how many were delivered."""
        sent = 0
        for f in sorted(self.spool.glob("*.json")):
            event = json.loads(f.read_text())
            try:
                status = self._post(event)
            except OSError:
                return sent
            if status in (200, 201) or 400 <= status < 500:
                f.unlink()
                sent += status in (200, 201)
            else:
                return sent
        return sent
