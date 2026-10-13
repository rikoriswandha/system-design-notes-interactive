# System Design Notes Interactive

**Bahasa Indonesia + English**, with an extensible locale registry and shared simulation logic.

A self-study learning path covering the 28 chapters in [liquidslr/system-design-notes](https://github.com/liquidslr/system-design-notes), based on notes from Alex Xu’s System Design Interview. All explanations, exercises, and visual models are original adaptations, not copied book prose or diagrams.

## Run locally

Requires Node.js 20 or newer. There are no runtime dependencies and no install step; `dist/` is ready to serve as committed.

```sh
npm run dev
```

Open `http://localhost:8000/`. The language selector offers Bahasa Indonesia and English. Deep links preserve the language and chapter, e.g. `http://localhost:8000/?lang=en#chapter-26/lab`. Serve the `dist/` directory on any static host for deployment.

The chapter figures in `dist/figures/` are generated. After editing anything under `figures/`, rebuild them:

```sh
npm run build:figures                          # every chapter
node figures/build.mjs --only 19              # one chapter
node figures/build.mjs --only 19 --audit      # plus its geometry audit (slow for some chapters)
```

## What is included

- All 28 chapters: 183 concept sections, component maps, trade-off tables, common mistakes, objectives, and worked exercises.
- 25 parameterized case-study labs with 53 scenario presets, plus the original scaling/cache, rate limiter, and consistent hashing visual labs.
- One interactive isometric figure per chapter: a small machine whose working is the chapter's mechanism (a quorum vault, a Snowflake numbering press, a partition sealing line…), driven by the same lab model and controls. Figures respond to pointer and keyboard, ease toward new lab values, run an idle tour, pause offscreen, and honour reduced motion.
- 2,403 messages in each language: full lesson text, UI, controls, result explanations, assumptions, and exercises, plus 491 figure strings (labels, captions, readouts, accessible descriptions).
- Device-local language preference, locale-aware numbers, per-key fallback, optional plural forms, and direction metadata for future RTL languages.
- Chapter/tab/parameter state is preserved when switching languages. Parameters are not persisted after closing the page.

## Add another language

Translate a JSON catalog and add one entry to `dist/locales/registry.js`. Algorithms are shared across languages. See [LOCALIZATION.md](LOCALIZATION.md) for the workflow, placeholders, fallback rules, and checks.

## Chapter labs

| # | Chapter | Experiment | Figure |
|---|---|---|---|
| 1 | Scaling from zero to millions of users | Scaling, caching, and server failure | Capacity test bench |
| 2 | Back-of-the-envelope estimation | Microblog capacity calculator | Capacity arithmometer |
| 3 | System design framework | Design discussion time budget | Interview timekeeper |
| 4 | Rate Limiter | Token bucket, fixed window, and sliding log | Quota dispenser |
| 5 | Consistent Hashing | Hash ring, virtual nodes, and remapping | Successor dividing head |
| 6 | Key-value store | Quorums with disconnected replicas | Quorum vault |
| 7 | Unique ID generator | Snowflake bit budget and bursts | Snowflake numbering press |
| 8 | URL shortener | Code space and redirect load | Code embosser |
| 9 | Web crawler | Frontier and politeness bottlenecks | Frontier sorting bench |
| 10 | Notification system | Retry amplification and notification backlog | Notification sorter |
| 11 | News Feed System | Feed fanout cost | Feed mailroom |
| 12 | Chat System | Group fanout and heartbeats | Chat switchboard |
| 13 | Search Autocomplete | Top-k cache versus prefix scan | Prefix catalogue |
| 14 | Youtube | Transcoding capacity and bandwidth | Film duplication bench |
| 15 | Google Drive | Block-based delta transfer | Delta letterpress |
| 16 | Proximity Service | Cell size and radius candidates | Radius surveying table |
| 17 | Nearby Friends | Location amplification and data age | Location radar table |
| 18 | Google Maps | GPS batching and route selection | GPS tape recorder |
| 19 | Distributed Message Queue | Lag and partition parallelism limits | Partition sealing line |
| 20 | Metrics Monitoring and Alerting System | Cardinality and tiered retention | Time-series card chest |
| 21 | Ad Click Event Aggregation | Late events and deduplication | Click inspection conveyor |
| 22 | Hotel Reservation System | Racing for the last inventory | Front-desk key rack |
| 23 | Distributed Email Service | Outbound retries and attachment amplification | Outbound sorting desk |
| 24 | S3-like Object Storage | Redundancy capacity and node loss | Redundancy service rack |
| 25 | Real-time Gaming Leaderboard | Shard costs for top-K and hotspots | Leaderboard tote cabinet |
| 26 | Payment System | Retries, deduplication, and reconciliation | Keyed cash register |
| 27 | Digital Wallet | Transfers, coordinator failures, and replay | Transfer balance scales |
| 28 | Stock Exchange | Limit-order matching and the critical-path budget | Limit-order card sorter |

## Source layout

```text
dist/
  index.html, course.js, course.css  Course shell
  figure-host.js                    Loads and mounts the chapter figure above each lab
  figures/kit.js, iso.css, cNN.js   Generated figure runtime, styles and one script per chapter
  modules/group-*.js                Shared chapter factories and models
  locales/registry.js               Language metadata
  locales/id.json, en.json          Translation catalogs
  i18n.js                           Localization runtime
  legacy.html, app.js, style.css    Original visual labs
figures/
  build.mjs, lib.mjs                Figure build (Node, no dependencies) and shared card helpers
  kit/                              Vendored anatomy isometric kit (MIT, see kit/LICENSE)
  cNN/figure.mjs                    Chapter geometry, built once in Node
  cNN/live.js                       Chapter motion and interaction in the browser
  cNN/strings.json                  Chapter figure strings (id, en), synced into the catalogs by the build
scripts/
  serve.cjs                         Dependency-free local server
  check-locales.cjs                  Registry/catalog completeness check
  validate-i18n.cjs                  Model, locale, and UI regression suite
  validate-figures.cjs              Generated figures: registration, catalog keys, build freshness
  fixtures/model-results.json       Pre-localization numerical baselines
```

## Test

```sh
npm test
npm run check:locales
```

The suite checks all 28 chapters and 168 chapter/mode/language views, 702 numerical comparisons with pre-localization outputs, 374 UI event paths, and legacy-lab behavior. It also checks catalog/placeholder parity, preference persistence, state preservation, unknown locales, fallback, plurals, RTL metadata, and local asset references. The figure check confirms that all 28 generated figures register, that every string they use exists in each catalog, and that the catalogs match `figures/cNN/strings.json`. Tests use a DOM/event harness; figures were verified separately in headless Chrome (geometry audit, line-end check, desktop/phone captures), which the test suite does not repeat.

## Model boundaries and attribution

Every lab states its assumptions. Numbers illustrate capacity, coordination, and correctness; they are not production benchmarks or financial recommendations. Interactive labs cover selected mechanisms while lessons provide broader chapter coverage. For example, all five rate-limiter algorithms are explained, while the visual comparison simulates three.

References are linked in each chapter. Primary documents are used to clarify areas such as consistency, delivery semantics, idempotency, and HTTP behavior. The Pagefy reference was unavailable during initial retrieval; source chapter READMEs were read via GitHub. This is an independent educational adaptation, not an official Alex Xu product or a verbatim substitute for the books.
