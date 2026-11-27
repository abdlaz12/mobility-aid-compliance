from __future__ import annotations

import argparse
import json
import logging
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

import numpy as np

from . import sources
from .gallery import Gallery, ref_path
from .pipeline import Pipeline, build_models
from .publisher import Publisher
from .types import Config, PersonCloud


def run(args: argparse.Namespace) -> int:
    cfg = Config.from_env()
    seg, aid, reid = build_models(cfg)
    cfg.model_version = f"{seg.name}+{aid.name}+{reid.name}"
    gallery = Gallery(cfg.embeddings_dir)
    if not args.dry_run:
        try:
            gallery.refresh_from_web(cfg.web_url, cfg.api_key)
        except OSError as e:
            print(f"warning: could not fetch the gallery ({e}); every person will be reported as unknown", flush=True)
    pipe = Pipeline(cfg, seg, aid, reid, gallery)
    pub = None if args.dry_run else Publisher(cfg.web_url, cfg.api_key, cfg.spool_dir)
    frames = sources.synthetic(args.room, args.frames, args.people) if args.source == "synthetic" else sources.from_directory(args.source, args.room)
    last_refresh = time.monotonic()
    for frame in frames:
        now = time.monotonic()
        if pub and now - last_refresh > cfg.gallery_refresh_s:
            try:
                gallery.refresh_from_web(cfg.web_url, cfg.api_key)
                pub.flush_spool()
            except OSError:
                pass
            last_refresh = now
        for event in pipe.process(frame, now):
            print(json.dumps(event) if pub is None else f"{event['person_track_id']} {event['aid']['label']} -> {pub.send(event)}", flush=True)
        if args.delay:
            time.sleep(args.delay)
    return 0


def enrol(args: argparse.Namespace) -> int:
    """Make an embedding from calibration frames and register its reference with the web system."""
    cfg = Config.from_env()
    seg, _aid, reid = build_models(cfg)
    ok = 0
    for f in args.files:
        pts = np.load(f)[:, :4].astype(float)
        from .types import Frame
        from datetime import datetime, timezone
        frame = Frame(pts, datetime.now(timezone.utc), "enrol")
        labels = seg.segment(frame)
        biggest = max((int(x) for x in np.unique(labels) if x >= 0), key=lambda l: int((labels == l).sum()), default=None)
        if biggest is None:
            print(f"{f}: no person found, skipped")
            continue
        ref = f"emb-{args.patient}-{uuid.uuid4().hex[:8]}"
        path = ref_path(Path(cfg.embeddings_dir), ref)
        path.parent.mkdir(parents=True, exist_ok=True)
        np.save(path, reid.embed(PersonCloud(frame.points[labels == biggest], biggest)))
        body = json.dumps({"patient_code": args.patient, "embeddingRef": ref, "aid": args.aid, "isAssisted": args.assisted}).encode()
        req = urllib.request.Request(f"{cfg.web_url}/api/reid/enrol", data=body, method="POST", headers={"Content-Type": "application/json", "Authorization": f"Bearer {cfg.api_key}"})
        try:
            with urllib.request.urlopen(req, timeout=10) as r:  # noqa: S310
                print(f"{f}: enrolled as {ref} ({r.status})")
                ok += 1
        except urllib.error.HTTPError as e:
            path.unlink(missing_ok=True)  # a refused enrolment (no consent, discharged...) must leave no embedding behind
            print(f"{f}: refused by the web system ({e.code}): {e.read().decode()[:200]}")
    return 0 if ok == len(args.files) else 1


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO)
    ap = argparse.ArgumentParser(prog="mobility_pipeline")
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run", help="process frames and send detection events")
    r.add_argument("--source", default="synthetic", help="'synthetic' or a folder of .npy frames (N x 4)")
    r.add_argument("--room", default="R-204")
    r.add_argument("--frames", type=int, default=20)
    r.add_argument("--people", type=int, default=2)
    r.add_argument("--delay", type=float, default=0.0, help="seconds between frames")
    r.add_argument("--dry-run", action="store_true", help="print events instead of sending")
    r.set_defaults(fn=run)
    e = sub.add_parser("enrol", help="create an embedding from calibration frames and register it")
    e.add_argument("--patient", required=True, help="patient code, for example P-0042")
    e.add_argument("--aid", required=True, choices=["none", "cane", "crutches", "walker", "wheelchair"])
    e.add_argument("--assisted", action="store_true", help="recorded with a helper")
    e.add_argument("files", nargs="+")
    e.set_defaults(fn=enrol)
    args = ap.parse_args(argv)
    return args.fn(args)
