# Smart Chennai — AI-Powered ICCC (Base Scaffold)

This is the **Phase 0 base** for the Smart Chennai ICCC prototype (BCSE355L, Digital Assignment Part 2). It already has the dark theme, i18n (English/Tamil/Hindi), 3D landing hero, animated KPI cards, and data model wired up. Everything else in the build roadmap (traffic module, emergency dispatch, water/flood, citizen portal, AI layer, executive dashboard, admin) plugs into this shell — hand each phase's prompt from the roadmap to your coding tool one at a time.

## What's included

- `src/app/[locale]/` — Next.js App Router with locale-prefixed routes (`/en`, `/ta`, `/hi`)
- `src/app/[locale]/page.tsx` — public landing page with the 3D rotating skyline hero and animated stat cards
- `src/app/[locale]/dashboard/` — dashboard shell (sidebar + topbar + page-transition wrapper) with an overview page placeholder ready for the Phase 2 map
- `src/components/ui/` — `Card` (with optional 3D tilt) and `KpiCard` (count-up + accent flash) — reuse these everywhere
- `src/components/three/SkylineHero.tsx` — the react-three-fiber 3D hero, swap the procedural boxes for a real GLTF model later
- `messages/{en,ta,hi}.json` — locale strings; every UI string should live here, never hardcoded
- `prisma/schema.prisma` — data model (Zone, Junction, TrafficReading, Incident, WaterSensor, CCTVFeed, User)
- `prisma/seed.ts` — seeds Chennai's 15 zones + junctions incl. Kathipara and Panagal Park
- `worker/simulate.ts` — Phase 1 sensor simulator skeleton (peak-hour traffic curve + incident spawning over Socket.io)

## Setup

```bash
npm install
cp .env.example .env       # fill in DATABASE_URL, REDIS_URL, MAPBOX token
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev                # Next.js app on http://localhost:3000
npm run worker             # in a second terminal — sensor simulator + Socket.io on :4001
```

Visit `http://localhost:3000/en` (or `/ta`, `/hi`).

## Next steps

Follow the phases in `smart-chennai-iccc-build-roadmap.md`, starting from Phase 2 (this scaffold covers Phase 0). Each phase prompt is written to be pasted directly into an AI coding tool (Claude Code, etc.) against this codebase.

## Notes on what's stubbed vs. real

- The traffic curve, incident MCDA scoring, Haversine dispatch math, and PostGIS radius queries described in the roadmap are **not yet implemented** here — this scaffold is the foundation (theme, i18n, layout, data model, worker skeleton) they get built on top of.
- `Zone.boundary` seed data uses placeholder rectangular polygons, not real GCC zone boundaries — replace with actual GeoJSON if you want the map to be geographically accurate.
- Mapbox/Leaflet map itself (Phase 2) is not included yet — the dashboard overview page has a placeholder panel marking where it goes.
