# `assets/body.glb` — Sketchfab Gadzhiev male anatomy GLB

**Status:** NOT CHECKED IN. Must be downloaded by the user because Sketchfab requires authentication for asset download.

## What to download

- **Source:** Sketchfab, model by **Ruslan Gadzhiev** — male anatomy/body GLB.
- **License:** **CC-BY 4.0** — attribution required and shown in the dashboard footer when 3D mode is active (see §5 of `specs/dashboard-design.md`).
- **Path:** save the file at `Projects/health-fat-loss/assets/body.glb`.

## Constraints

| Check | Requirement | Why |
|---|---|---|
| File size | < **8 MB** after Draco compression | §5 `Body map strategy` hard cap |
| Format | glTF 2.0 binary (`.glb`) | `<model-viewer>` input |
| Attribution | keep the footer line verbatim: `3D model: Ruslan Gadzhiev / Sketchfab · CC-BY 4.0` | acceptance criterion A9 |

## Draco compression

If the Sketchfab download is > 8 MB, use `gltf-transform`:

```bash
npx @gltf-transform/cli draco body.glb body.glb
```

Re-check:

```bash
ls -l body.glb   # expect < 8 MB
```

## What happens when the file is missing (current state)

The dashboard's F8 failure-mode handler (§11) detects a `<model-viewer>` load error and:

1. Hides the 2D↔3D toggle on the Body view.
2. Falls back to 2D-only rendering (which is a full-quality fallback).
3. Logs `[asset] body.glb failed to load` to the console — **no user-facing banner**.

Acceptance criteria A6, A7, A8, A10 still pass (they exercise 2D). A9 is vacuously satisfied because 3D mode cannot become active without the asset.

## Why we don't ship a placeholder

CC-BY 4.0 requires attribution of the **actual** asset's author. Shipping a stand-in (e.g. a Khronos-sample GLB) while displaying the Gadzhiev attribution line is a license violation. Shipping nothing is clean, the dashboard degrades gracefully, and the A9 attribution line is only rendered once the correct asset is in place.
