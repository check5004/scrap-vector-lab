# Stable release 0.3.0

Production URL: https://check5004.github.io/scrap-vector-lab/

This is the production variant of the reviewed `0.3.0-dev.3` layout and analysis flow. It changes release identity, repository/deployment guards, production key-slot selection, and channel-specific labels/docs. Measurement, neural inference, bounded search, provider consent/cost gates, editing, and export behavior retain the reviewed implementation. Stable is a release channel, not a physical-accuracy certification.

## Source and deployment

- Source and deployed repository: `check5004/scrap-vector-lab`.
- `release/0.3.0` is verification-only; `main` is the production deployment branch.
- `scripts/verify-release.mjs` accepts only those exact refs in that exact repository. It requires package, package-lock and build metadata to say `0.3.0`, channel `stable`, and the original source repository. It rejects beta repositories, unrelated branches, PR merge refs, tags, and `release-source.json` distribution mappings.
- `GITHUB_SHA` must be a full lowercase Git SHA and match `git rev-parse HEAD`. An existing `SCRAP_SOURCE_COMMIT` override must match it. Only after every check passes does verification write that same SHA into `SCRAP_SOURCE_COMMIT` and emit the successful stable guard.
- The screen, tuning record, diagnostics, measurement JSON/SVG, and DXF comment use `0.3.0+<7-character source SHA>` and the same full stable source commit. Local builds use `0.3.0+local`. There is no source/distribution commit remapping.
- The workflow keeps the full fixture, pinned-asset, unit, desktop/mobile browser, Docker build, actual-container browser, MIME and model-hash verification. Only successful original-repository `main` push/manual runs with the stable guard can upload a Pages artifact and deploy. Release-branch verification cannot deploy.
- The separate [beta contract](BETA_RELEASE.md) continues to describe `0.3.0-dev.3`, its beta source branch and its independently mapped distribution repository. A production release does not silently update that beta.

## Existing keys and beta isolation

Stable retains these exact historical production slots and version-1 record schema:

- `scrap-vector-lab:provider-key:v1:openai`
- `scrap-vector-lab:provider-key:v1:openrouter`

Existing valid production records are restored directly; no migration or overwrite is needed. Stable never reads, imports, writes or deletes `scrap-vector-lab-beta:provider-key:v1:*`. Saving/clearing affects only the selected production provider. Unit and browser regressions seed synthetic historical production records, check load/reload survival and instrument beta slots for unexpected access. No real user key is read for verification and no paid request is made.

Both GitHub Pages project paths share the `check5004.github.io` origin. Separate storage names prevent accidental collisions, not a security boundary: localStorage is unencrypted and can be read by scripts on that origin or browser extensions. Use a trusted personal device and clear keys when no longer needed. Saving or restoring keys never starts authentication, image transmission, or paid inference by itself. See [provider setup and security](PROVIDERS.md).

## Layout and retained limitations

Step **02** contains the default-closed **解析の詳細設定** with B threshold/epsilon, local recovery/search/candidates/restore, expert visual review, and A grid spacing. The normal optional B review switch and 1–3 call cap stay beside method selection and the single Analyze action. Step **03** contains result-only correction, dimensions, editing, and exports. Opening/closing settings never runs analysis or sends a photo.

Actual U²-NetP masks still determine B geometry; scores reflect heuristic stability/preservation, not photograph correctness or measurement accuracy. The known filled-hole failure remains visible. Optional external review stays off by default, requires the explicit disclosed start, and cannot fix geometric ambiguity, guarantee correctness, or guarantee a dollar cap. Important dimensions require independent physical measurement.

See [the regression matrix and browser verification limits](AUTO_TUNE_TESTING.md). Local unit/build/discovery success is not a browser pass; the exact stable commit must pass the permitted CI renderer and actual container before release verification is complete.
