# ML (placeholder)

The ML contribution is **person segmentation for 2 to 5 people in one LiDAR frame**, so the existing classification (PTv3) and ReID (ReID3D) models can run on each person.

Approach: synthetic multi-person scenes composed from single-person VLS-128 data, with the nearest-point gap between people as the controlled difficulty. Methods compared: Kirkby's rule-based pipeline, a multi-cluster DBSCAN variant, and learned segmentation (PTv3).

Early exploration on public nuScenes data lives in a separate learning workspace and is not part of this repository yet. Reusable code will move here as a Python package (`mobility_ml`: sensor configs, loaders, preprocessing, scene composition, evaluation).

## Data policy
No participant data, point clouds or model weights are committed. Participant data stays on lab-controlled Carleton storage.
