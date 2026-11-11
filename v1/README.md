# Imperium Gzowiańskie

A pass-the-tablet property game set on a low-poly plot in Gzowo: dice, pawns, card packs, a Gzowium exchange and a voiced octopus host.

Play: https://imperium.gzowo.fun

- Static site, no build step: vanilla ES modules and three.js from a CDN.
- `src/game/engine.js` holds all rules; the app is the bank and the judge.
- The host speaks through Gemini Live behind a relay (`relay/worker.js`, Cloudflare Worker) that needs a family code. Without the code the game plays silently.
- `vX.Y/` folders are frozen copies of each deployed version.
- Sound credits: `assets/audio/CREDITS.md`.
