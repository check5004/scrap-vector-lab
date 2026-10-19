# Changelog

## 0.4.0 — 2026-10-19

Promotes the reviewed 0.3.0-dev.5 source `6ce477f2899bf55234ce00573b876a65e062881a` to the production app. No additional geometry features are introduced during promotion.

- One-click analysis automatically generates straight-priority mixed line/cubic contours. B fits the dense mask contour before Douglas–Peucker simplification, preserving supported corners and holes within explicit error and computation budgets; failures retain the straight result with a reason.
- A accepts native line/cubic image-AI responses and legacy polygons. Live provider/schema acceptance remains unverified; local provider tests use explicit synthetic responses. A has no B-style dense-contour error guarantee and never silently switches to B.
- Photo overlays retain the original contour for comparison and cancellation. Optional handles are for refinement; same-result drafts and undo are retained in-page.
- Curve-aware measurements and SVG/JSON/DXF share the selected geometry. SVG and JSON preserve accepted cubic controls; DXF approximates curves with maximum chord deviation 0.01 mm. The existing `2.0-beta` curve JSON schema identifier is preserved for compatibility; application channel is stable.
- Retains production key storage namespace, relative asset base, explicit paid-call consent and source-commit provenance. No stored beta keys are migrated.
- CI keeps all unit/browser/actual-container checks with a 35-minute job budget; main deploys only after successful stable verification.

Limitations: contour-fit error is relative to the sampled neural mask, not physical accuracy. Model-missed holes remain possible. Area and topology checks use documented numerical approximations. Synthetic circle images exercise the real ONNX pipeline but do not validate physical materials. Mobile Chromium emulation is tested; physical iPhone Safari is not.

## 0.3.0

Previous production release: `c4955a2ccc05a281c664e9d1e949e7ab832745ca`. Unified analysis, bounded B threshold/epsilon search, calibration, editing and exports.
