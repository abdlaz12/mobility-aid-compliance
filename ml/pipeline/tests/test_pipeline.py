import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from mobility_pipeline import sources
from mobility_pipeline.gallery import Gallery, ref_path
from mobility_pipeline.pipeline import Pipeline, build_models, mask_people
from mobility_pipeline.publisher import REQUIRED, Publisher, build_event
from mobility_pipeline.stubs import ShapeEmbedder
from mobility_pipeline.tracking import Tracker
from mobility_pipeline.types import Config, Frame, Observation, PersonCloud


def frame(people=2, seed=1):
    return next(sources.synthetic(frames=1, people=people, seed=seed))


class Masking(unittest.TestCase):
    def test_two_people_far_apart_get_two_clouds(self):
        f = frame(people=2)
        clouds = mask_people(f, build_models(Config())[0].segment(f), 30)
        self.assertEqual(len(clouds), 2)

    def test_tiny_clusters_are_noise(self):
        f = frame(people=1)
        noise = np.array([[9.0, 9.0, 1.0, 0.5]] * 3)
        f2 = Frame(np.vstack([f.points, noise]), f.timestamp, f.room_id)
        labels = build_models(Config())[0].segment(f2)
        self.assertEqual(len(mask_people(f2, labels, 30)), 1)

    def test_each_cloud_holds_only_its_own_points(self):
        f = frame(people=3)
        labels = build_models(Config())[0].segment(f)
        clouds = mask_people(f, labels, 30)
        self.assertEqual(sum(len(c.points) for c in clouds), int((labels >= 0).sum()) - sum(int((labels == l).sum()) for l in set(labels) - {c.label for c in clouds} - {-1}))


class Tracking(unittest.TestCase):
    def obs(self, x, aid="walker", code="P-0042"):
        return Observation(np.array([x, 0.0, 1.0]), aid, 0.9, code, 0.9)

    def test_same_person_keeps_the_same_track(self):
        t = Tracker(1.0, 5.0, 5, 0.0)
        a = t.update([self.obs(0.0)], 0.0)[0][0]
        b = t.update([self.obs(0.3)], 1.0)[0][0]
        self.assertEqual(a, b)

    def test_a_person_far_away_is_a_new_track(self):
        t = Tracker(1.0, 5.0, 5, 0.0)
        a = t.update([self.obs(0.0)], 0.0)[0][0]
        b = t.update([self.obs(5.0)], 1.0)[0][0]
        self.assertNotEqual(a, b)

    def test_one_bad_frame_does_not_flip_the_aid(self):
        t = Tracker(1.0, 5.0, 5, 0.0)
        out = None
        for i, aid in enumerate(["walker", "walker", "none", "walker", "walker"]):
            out = t.update([self.obs(0.0, aid)], float(i))[0][1]
        self.assertEqual(out.aid_label, "walker")

    def test_events_are_limited_to_one_per_interval(self):
        t = Tracker(1.0, 5.0, 5, 2.0)
        due = [t.update([self.obs(0.0)], float(s))[0][2] for s in range(5)]
        self.assertEqual(due, [True, False, True, False, True])


class GalleryRules(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        self.g = Gallery(self.dir)

    def tearDown(self):
        self.tmp.cleanup()

    def save(self, ref, vec):
        np.save(ref_path(self.dir, ref), np.array(vec, dtype=float))

    def test_matches_the_closest_patient(self):
        self.save("a", [1, 0, 0])
        self.save("b", [0, 1, 0])
        self.g.load([{"patient_code": "P-1", "embedding_ref": "a"}, {"patient_code": "P-2", "embedding_ref": "b"}])
        self.assertEqual(self.g.match(np.array([0.9, 0.1, 0]), 0.3)[0], "P-1")

    def test_a_weak_match_is_an_unknown_person(self):
        self.save("a", [1, 0, 0])
        self.g.load([{"patient_code": "P-1", "embedding_ref": "a"}])
        code, conf = self.g.match(np.array([0, 1, 0]), 0.3)
        self.assertEqual((code, conf), (None, 0.0))

    def test_files_the_web_system_no_longer_lists_are_deleted(self):
        self.save("a", [1, 0, 0])
        self.save("withdrawn", [0, 1, 0])
        self.g.load([{"patient_code": "P-1", "embedding_ref": "a"}])
        self.assertTrue(ref_path(self.dir, "a").exists())
        self.assertFalse(ref_path(self.dir, "withdrawn").exists())

    def test_an_empty_gallery_deletes_everything(self):
        self.save("a", [1, 0, 0])
        self.g.load([])
        self.assertEqual(list(self.dir.glob("*.npy")), [])

    def test_unsafe_references_are_refused(self):
        for bad in ["../x", "a/../../b", "/etc/passwd", "has space", ""]:
            with self.assertRaises(ValueError):
                ref_path(self.dir, bad)


class Events(unittest.TestCase):
    def test_event_has_every_required_field_and_no_points(self):
        e = build_event(Observation(np.zeros(3), "none", 0.97, "P-0042", 0.91), "t-1", "R-204", datetime.now(timezone.utc), "stub")
        self.assertTrue(REQUIRED <= set(e))
        self.assertEqual(e["identity"], {"patient_id": "P-0042", "confidence": 0.91})
        self.assertNotIn("points", str(e).lower())

    def test_an_unreachable_server_spools_the_event(self):
        with tempfile.TemporaryDirectory() as d:
            p = Publisher("http://127.0.0.1:9", "k", d, retries=1, timeout=0.2)
            e = build_event(Observation(np.zeros(3), "none", 0.9, None, 0.1), "t-1", "R-204", datetime.now(timezone.utc), "stub")
            self.assertEqual(p.send(e), "spooled")
            self.assertEqual(len(list(Path(d).glob("*.json"))), 1)


class EndToEnd(unittest.TestCase):
    def test_enrolled_person_is_recognised_in_a_scene_with_two_people(self):
        with tempfile.TemporaryDirectory() as d:
            cfg = Config(embeddings_dir=d, emit_every_s=0.0)
            seg, aid, reid = build_models(cfg)
            gallery = Gallery(d)
            f = frame(people=2)
            first = mask_people(f, seg.segment(f), cfg.min_points)[0]
            np.save(ref_path(Path(d), "p42"), ShapeEmbedder().embed(first))
            gallery.load([{"patient_code": "P-0042", "embedding_ref": "p42"}])
            events = Pipeline(cfg, seg, aid, reid, gallery).process(f, 0.0)
            self.assertEqual(len(events), 2)
            self.assertIn("P-0042", [e["identity"]["patient_id"] for e in events])
            self.assertEqual({e["aid"]["label"] for e in events}, {"walker", "none"})

    def test_real_models_refuse_to_run_until_connected(self):
        seg, _, _ = build_models(Config(models="real"))
        with self.assertRaises(NotImplementedError):
            seg.segment(frame())


if __name__ == "__main__":
    unittest.main()
