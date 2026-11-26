# Figma Make design snapshot

A copy of the source of the interface design made in Figma Make (taken 2026-11-26). It is a **reference**, not the application: one `App.tsx` that draws every screen inside simulated 375, 768 and 1280 px frames, with fake data only (Demo Patient A, P-0042, and so on). Responsiveness there is simulated by a `viewport` prop, not by CSS breakpoints.

Why it is here: so changes to the design can be traced, and so the standalone frontend in `../../frontend/` can be compared with it. The tokens (colors, light and dark) and the look of the screens are taken from this file.

To look at it: copy this folder somewhere, add an `index.html` that loads `/src/main.tsx` and a `vite.config.ts` with the React and Tailwind plugins, run `npm install` and `npm run dev`. (The original Make `vite.config.ts` is not included because it depends on Figma-only files.)

Do not edit these files; edit the frontend.
