# 端材ラボ · Scrap Vector Lab

Smartphone-photo scrap-material vectorization and per-edge measurement PoC. A **separate, static project** with real ArUco calibration, real browser-local neural segmentation, optional GPT-6 Luna visual inference, and a touch-friendly polygon editor.

## What is implemented

- Real OpenCV-compatible `DICT_4X4_50` marker decoding using js-aruco2 2.0.0 (vendored unchanged algorithms with ESM import/export adaptation), IDs 0/1/2/3 at top-left/top-right/bottom-right/bottom-left. The inward-facing canonical corner defines the reference rectangle.
- A4 landscape 297 × 210 mm SVG/PNG print sheet. Reference rectangle 250 × 170 mm; A4 rectification 2500 × 1700 px. Also 500/1000 mm square presets at 2000 × 2000, and custom sizes.
- Three generated perspective photographs: L-shape, concave notch, trapezoid with 40 mm round hole, including surface scratches and uneven illumination. Ground truth lives separately and is used **only for evaluation**.
- Mode A: actual `gpt-6-luna` OpenAI Responses API image input with millimetre grid and strict structured output. User-supplied key stays in this tab's memory; model access is checked first. **No key means disabled, no model substitutions, no simulated inference.** Sending the image is explicit and paid API usage is disclosed.
- Mode B: actual U²-NetP ONNX inference in a Web Worker using ONNX Runtime Web WASM. The binary mask comes from neural probabilities. Boundary tracing and Douglas–Peucker are applied to that mask in millimetres. No Canny/photographic threshold segmentation and no fixture-to-prediction shortcuts.
- Mode C: clone A or B, drag/add/delete vertices, undo, ±5° horizontal/vertical snapping, manually draw an outer contour or missing hole. Invalid/self-crossing geometry and invalid hole topology are rejected.
- Compare overlays, net area, per-edge lengths/angles, sampled bidirectional boundary error, area error, hole-count mismatch, and topology-gated edge-length errors.
- JSON, physical-mm SVG (separate dimensions layer, evenodd holes), and DXF closed LWPOLYLINE (INSUNITS=4, y-up CAD coordinates).

## Important observed limitation

**Automatic hole extraction is not solved by this model.** In real local CPU model tests, U²-NetP completely filled the synthetic 40 mm hole. A bounded test of the much larger full U²-Net model (176 MB) also filled it and did not improve the other fixtures. The app explicitly warns about this failure, benchmarks it as a missed hole, and supports drawing the hole in Mode C. It never substitutes truth geometry or a color-threshold hole for an AI result. See `public/samples/u2netp-python-baseline.json`, `public/samples/u2net-full-python-baseline.json`, and [runtime research](docs/RUNTIME_RESEARCH.md).

The native AI input is 320 × 320. For A4 this corresponds to about 0.781 × 0.531 mm per mask sample. A 0.1 mm rectified pixel is **not** a 0.1 mm accuracy claim. These synthetic results cannot certify real metal measurement. Thickness, lens distortion, camera angle, blur, glare, paper stretch, and print scaling matter. Keep markers and the measured surface coplanar and verify important dimensions with a ruler/caliper.

## Local development

Node 22+ and Python 3.11+:

```sh
python -m venv .venv
. .venv/bin/activate
pip install -r requirements-fixtures.txt
python scripts/generate_samples.py
npm ci
npm run assets
npm run dev
```

The fixture generator writes all print/photo/truth assets. `npm run assets` downloads the 4.6 MB upstream model if absent, validates its SHA-256, and copies the exact locked 1.23.2 WASM/MJS runtime after validating hashes. Model and runtime bytes are served from the same origin; no model CDN request is made at runtime. Approximately 17 MB of model/runtime assets are needed for the first Mode B run.

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
npm run preview
```

Browser tests use real marker decoding and real neural inference. They do not mock those operations and do not make paid API calls. Playwright covers desktop/mobile layout, inference, editing, JSON download, custom calibration, rejected marker-less inputs and memory-only key handling. The cloud workspace used during development could not launch local Chromium due to sandbox restrictions, so CI and the deployed browser are the authoritative browser checks.

## Docker

```sh
docker build -t scrap-vector-lab .
docker run --rm -p 8080:8080 scrap-vector-lab
```

Open http://localhost:8080. The build regenerates fixtures, verifies/downloads assets, runs geometry tests, and produces a static Nginx image. No credentials are embedded. Port 8080 is also compatible with a future Cloud Run deployment, but this project **does not activate billing, provision Cloud Run, or assume a guaranteed-free cloud runtime**. GitHub Pages is sufficient.

## GitHub Pages

`Verify and deploy Pages` builds from source, regenerates the synthetic fixtures, verifies model/runtime integrity, runs unit and real-browser tests, builds and starts Docker with HTTP/model-hash smoke tests, then publishes `dist` with GitHub Pages. Select GitHub Actions as the Pages source. Relative Vite base `./` works under `/scrap-vector-lab/`. Deployment is gated on tests.

No backend, database, analytics, persistent API-key storage, inventory, OCR or nesting subsystem is included.

## Model A security and cost

OpenAI's general guidance is not to expose secret API keys in browsers. This personal BYOK PoC is for a trusted, reviewed page on a trusted device, with explicit consent. There is no application-owned API key in the source, bundle or CI. The key is never written to localStorage/sessionStorage, exports or logs and is cleared on page exit. Clearing/changing the key or consent aborts an outstanding request, but cannot undo data already sent or charges already incurred. A production service should use a secure authenticated backend. Photo and dimensions are sent only to `https://api.openai.com` when the user explicitly runs Mode A; Mode B stays on the device. Provider retention rules still apply even with `store:false`. No paid call was made to validate this PoC; model documentation was verified, while a particular user's account/model entitlement is checked at runtime.

## Geometry and print contract

On the A4 page, the reference corners are `(23.5,20)`, `(273.5,20)`, `(273.5,190)`, `(23.5,190)` mm. Each marker is 12 mm square and sits outside the working rectangle. Canonical marker corner indices are `[2,3,0,1]`. Use canonical detected corner order, not screen-coordinate sorting. Print SVG at A4 landscape, **actual size / 100%**, with fit-to-page disabled. Keep individually cut-out markers in the same orientation as the sheet; rotating the whole photo is supported. A nearest-reference-corner check rejects individually rotated markers. Independently check both 100 mm rulers. PNG metadata is 254 DPI.

Coordinates are image-style x-right/y-down millimetres; exported directed angles are clockwise from +x in `[0,360)`. DXF uses `y = board.height - imageY`. Ring closure is implicit; each hole is a separate closed ring. The supplied L fixture area is correctly recomputed as **12,800 mm²**.

## License and attribution

Application code: MIT (see LICENSE). U²-Net upstream: Apache-2.0. rembg reference glue: MIT. ONNX Runtime and js-aruco2: MIT. Third-party notices and model provenance are in `public/licenses`, `public/models/u2netp.provenance.json`, and `docs/RUNTIME_RESEARCH.md`. Dependencies are locked in package-lock.json; the weight SHA-256 is pinned in scripts/fetch-assets.mjs. Synthetic assets contain no private user photographs or uploaded specification text.
