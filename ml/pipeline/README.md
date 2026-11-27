# Pipeline: LiDAR frame to detection event

Runs on the **inference server**. Design and reasons: [`docs/pipeline.md`](../../docs/pipeline.md). Needs Python 3.11+ and numpy.

```
frame → segmentation → masking → aid classification ┐
                               └→ ReID embedding → gallery match ┴→ tracking → detection event → web system
```

## Try it without any model (stand-ins, nothing real)
```bash
cd ml/pipeline
pip install -r requirements.txt
PYTHONPATH=. python -m unittest discover -s tests -t .            # 16 tests
PYTHONPATH=. python -m mobility_pipeline run --dry-run --people 3  # prints events
```
To send to a running web system (`npm run dev` in `web/`):
```bash
export WEB_URL=http://localhost:3000 INTAKE_API_KEY=dev-only-change-me
PYTHONPATH=. python -m mobility_pipeline run --frames 30 --delay 0.2
```

## Enrol a patient (needs consent recorded in the web system first)
```bash
PYTHONPATH=. python -m mobility_pipeline enrol --patient P-0042 --aid walker walk1.npy walk2.npy
PYTHONPATH=. python -m mobility_pipeline enrol --patient P-0042 --aid none --assisted helper1.npy
```
A refused enrolment (no consent, discharged patient) leaves no embedding file behind.

## Connect the real models
1. Put the weights under `models/` (see `models.example.yaml`; the folder is git-ignored).
2. Fill in the three classes in `mobility_pipeline/kirkby_adapters.py` (`segment`, `classify`, `embed`). Their input and output are fixed by `interfaces.py`.
3. Start with `MODELS=real`. Until then `MODELS=stub` (the default) is used.

| Setting (environment) | Default | Meaning |
|---|---|---|
| `MODELS` | `stub` | `stub` or `real` |
| `MODELS_DIR` | `models` | where the weights are |
| `EMBEDDINGS_DIR` | `data/embeddings` | embedding files (biometric; never leaves the server) |
| `SPOOL_DIR` | `data/spool` | events kept while the web system is unreachable |
| `WEB_URL`, `INTAKE_API_KEY` | `http://localhost:3000`, empty | where to send events; the same key the intake uses |

Frames for `--source <folder>` are `.npy` files of shape `N x 4` (x, y, z, intensity). Confirm this with the model authors (open question 1 in `docs/pipeline.md`).
