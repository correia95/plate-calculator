# plate-calculator

Enter a target weight for the barbell; it shows which plates to load per side,
heaviest first (fewest plates, most stable). kg or lb, bar weight selector, a
"limited plates" mode where you enter how many of each you own, a barbell
diagram, a warm-up ladder, and a "short by" figure when you can't hit the number
exactly. Setup in the URL.

**Live:** https://plate-calculator.correia95.workers.dev/

## Stack

- React 18 + TypeScript + Vite, no runtime deps beyond React
- Static-assets Cloudflare Worker

## Engine

[`src/plates.ts`](src/plates.ts): `loadBar(target, bar, plates, availablePerSide)`
greedily fills `(target - bar) / 2` per side from the heaviest plate, capped by
availability; returns per-side picks, loaded total, and any shortfall. `warmup`
builds an even ladder from the bar to the working weight, rounded to 2.5.

Verified in Node: 100 kg / 20 bar → 25 + 15 per side (exact); 142.5 → 25+25+10+1.25;
225 lb / 45 bar → 45+45; limited set falls back to smaller plates; below-bar
target handled.

## Develop / deploy

```bash
npm install
npm run dev
npm run deploy
```
