# Leonida Pools — Realistic GTA-Style Water + Live Fish

A self-contained Three.js demo: a swimming pool with hyper-realistic water and
fish swimming under the surface.

## Run

No build step and no server needed — **double-click `index.html`**. Everything
is in one file; Three.js 0.160 loads from a CDN, so an internet connection is
required at first load.

(Serving locally also works: `npx serve .` or `python3 -m http.server 8000`.)

## Features

- **Water surface shader** — sum-of-sines height field with analytic normals,
  screen-space refraction with per-channel chromatic dispersion, real mirrored
  reflections (oblique frustum clipping), Schlick Fresnel, sun glitter/specular.
- **Underwater pass** — depth fog (light absorption), animated procedural
  caustics injected into the pool floor/wall materials.
- **Fish school** — 16 procedurally modeled fish (koi, goldfish, silver
  sardines) with body-traveling sine swim animation, steering AI, wall/object
  avoidance and banking on turns.
- **Interaction** — orbit/zoom camera, click the water for physically-fading
  ripple rings; occasional automatic ripples keep the surface alive.

## Files

- `index.html` — whole demo in one file: page shell, HUD, import map,
  scene code, water/reflection/refraction shaders, fish simulation
- `README.md` — this file
