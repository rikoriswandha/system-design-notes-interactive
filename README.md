# System Design Notes Interactive

**Bahasa Indonesia + English**, with an extensible locale registry and shared simulation logic.

A self-study learning path covering the 28 chapters in [liquidslr/system-design-notes](https://github.com/liquidslr/system-design-notes), based on notes from Alex Xu’s System Design Interview. All explanations, exercises, and visual models are original adaptations, not copied book prose or diagrams.

## Run locally

Requires Node.js 20 or newer. There are no runtime dependencies and no install/build step.

```sh
npm run dev
```

Open `http://localhost:8000/`. The language selector offers Bahasa Indonesia and English. Deep links preserve the language and chapter, e.g. `http://localhost:8000/?lang=en#chapter-26/lab`. Serve the `dist/` directory on any static host for deployment.

## What is included

- All 28 chapters: 183 concept sections, component maps, trade-off tables, common mistakes, objectives, and worked exercises.
- 25 parameterized case-study labs with 53 scenario presets, plus the original scaling/cache, rate limiter, and consistent hashing visual labs.
- 2,403 messages in each language: full lesson text, UI, controls, result explanations, assumptions, and exercises.
- Device-local language preference, locale-aware numbers, per-key fallback, optional plural forms, and direction metadata for future RTL languages.
- Chapter/tab/parameter state is preserved when switching languages. Parameters are not persisted after closing the page.

## Add another language

Translate a JSON catalog and add one entry to `dist/locales/registry.js`. Algorithms are shared across languages. See [LOCALIZATION.md](LOCALIZATION.md) for the workflow, placeholders, fallback rules, and checks.

## Chapter labs

| # | Chapter | Experiment |
|---|---|---|
| 1 | Scaling from zero to millions of users | Scaling, caching, and server failure |
| 2 | Back-of-the-envelope estimation | Microblog capacity calculator |
| 3 | System design framework | Design discussion time budget |
| 4 | Rate Limiter | Token bucket, fixed window, and sliding log |
| 5 | Consistent Hashing | Hash ring, virtual nodes, and remapping |
| 6 | Key-value store | Quorums with disconnected replicas |
| 7 | Unique ID generator | Snowflake bit budget and bursts |
| 8 | URL shortener | Code space and redirect load |
| 9 | Web crawler | Frontier and politeness bottlenecks |
| 10 | Notification system | Retry amplification and notification backlog |
| 11 | News Feed System | Feed fanout cost |
| 12 | Chat System | Group fanout and heartbeats |
| 13 | Search Autocomplete | Top-k cache versus prefix scan |
| 14 | Youtube | Transcoding capacity and bandwidth |
| 15 | Google Drive | Block-based delta transfer |
| 16 | Proximity Service | Cell size and radius candidates |
| 17 | Nearby Friends | Location amplification and data age |
| 18 | Google Maps | GPS batching and route selection |
| 19 | Distributed Message Queue | Lag and partition parallelism limits |
| 20 | Metrics Monitoring and Alerting System | Cardinality and tiered retention |
| 21 | Ad Click Event Aggregation | Late events and deduplication |
| 22 | Hotel Reservation System | Racing for the last inventory |
| 23 | Distributed Email Service | Outbound retries and attachment amplification |
| 24 | S3-like Object Storage | Redundancy capacity and node loss |
| 25 | Real-time Gaming Leaderboard | Shard costs for top-K and hotspots |
| 26 | Payment System | Retries, deduplication, and reconciliation |
| 27 | Digital Wallet | Transfers, coordinator failures, and replay |
| 28 | Stock Exchange | Limit-order matching and the critical-path budget |

## Source layout

```text
dist/
  index.html, course.js, course.css  Course shell
  modules/group-*.js                Shared chapter factories and models
  locales/registry.js               Language metadata
  locales/id.json, en.json          Translation catalogs
  i18n.js                           Localization runtime
  legacy.html, app.js, style.css    Original visual labs
scripts/
  serve.cjs                         Dependency-free local server
  check-locales.cjs                  Registry/catalog completeness check
  validate-i18n.cjs                  Model, locale, and UI regression suite
  fixtures/model-results.json       Pre-localization numerical baselines
```

## Test

```sh
npm test
npm run check:locales
```

The suite checks all 28 chapters and 168 chapter/mode/language views, 702 numerical comparisons with pre-localization outputs, 374 UI event paths, and legacy-lab behavior. It also checks catalog/placeholder parity, preference persistence, state preservation, unknown locales, fallback, plurals, RTL metadata, and local asset references. Tests use a DOM/event harness; no real-browser visual or WebMCP validation is claimed.

## Model boundaries and attribution

Every lab states its assumptions. Numbers illustrate capacity, coordination, and correctness; they are not production benchmarks or financial recommendations. Interactive labs cover selected mechanisms while lessons provide broader chapter coverage. For example, all five rate-limiter algorithms are explained, while the visual comparison simulates three.

References are linked in each chapter. Primary documents are used to clarify areas such as consistency, delivery semantics, idempotency, and HTTP behavior. The Pagefy reference was unavailable during initial retrieval; source chapter READMEs were read via GitHub. This is an independent educational adaptation, not an official Alex Xu product or a verbatim substitute for the books.
