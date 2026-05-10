# lib/pulse

Server-side modules for the /pulse page.

## Regenerating `brain.png` and `brainMask.json`

The brain backdrop is a one-shot gpt-image generation. To regenerate:

1. Run the gpt-image skill with the prompt documented in `docs/superpowers/specs/2026-05-10-pulse-page-design.md` (style B). Save the output to `public/brain.png` (2048×2048 PNG).
2. Re-trace the polygon mask:
   ```bash
   node scripts/trace-brain-mask.mjs
   ```
3. Inspect `brainMask.json` and the resulting `/pulse` rendering. If too many nodes are clipped to the boundary, adjust `LUMA_THRESHOLD` in the script and re-run.

The current implementation uses a convex hull. If you need a concave fit, replace the hull step in the script with a marching-squares trace (pngjs-only, no native deps).
