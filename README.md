# 🕷 Greed Island — The Spider's Web

> **Challenge 01** · Phantom Troupe network · Dynamic MST with cursed-edge detection

A vanilla HTML/CSS/JS single-page application that models the Phantom Troupe's
Nen connections as a dynamic weighted graph and keeps a **Minimum Spanning
Tree** live-updated as the web mutates. One of the threads in the web is
**cursed** — the system detects it and refuses to weave it into the tree.

---

## Features

- **13 nodes** — every Phantom Troupe member, arranged on a ring.
- **Interactive SVG graph** with glowing MST strands and flickering cursed edges.
- **Live controls**
  - Add Edge (nodeA, nodeB, weight)
  - Remove Edge
  - Update Weight
  - Search Node → lists every thread connected to a member
- **MST panel** — total weight, edge list, spanning / forest indicator.
- **Anomaly Report** — explains *which* edge is suspicious and *why*.
- **Edge inspector** — click any edge on the web to see weight, MST status,
  and a suspicion level (NONE / LOW / MEDIUM / HIGH / CURSED) with reasoning.
- **Incremental MST** — no full rebuild per mutation; see
  [`strategy.txt`](./strategy.txt) for the proof sketch.

---

## Running

No build step, no dependencies. Just open the file:

```bash
# from the repo root
start index.html        # Windows
open  index.html        # macOS
xdg-open index.html     # Linux
```

Or serve it with any static server (`python -m http.server`, `npx serve`, …).

---

## File layout

| File | Role |
| --- | --- |
| `index.html` | SPA markup, SVG container, control forms, report panels |
| `styles.css` | Meteor-City dark theme, glowing MST, flickering cursed edges |
| `script.js` | Graph model, required API, Kruskal + DSU, incremental MST, anomaly detector, SVG renderer |
| `strategy.txt` | MST algorithm, optimization strategy, and anomaly-detection logic |

---

## Required API (exposed in `script.js`)

```js
addEdge(graph, edge)                // {a, b, weight}
removeEdge(graph, edgeId)
updateWeight(graph, edgeId, newWeight)
computeMST(graph)                   // Kruskal + Union-Find
detectAnomaly(graph)                // cursed / suspicious / outlier report
```

---

## Algorithms at a glance

- **MST base** — Kruskal + Union-Find (path compression + union by rank),
  `O(E log E)` on the initial build.
- **Incremental on add** — cycle-property swap: find the heaviest edge on the
  MST's u–v path; swap if the new edge is lighter. `O(V)`.
- **Incremental on remove** — cut-property reconnect: label the two sides after
  splitting, pick the minimum non-MST, non-cursed edge crossing the cut.
  `O(V + E)`.
- **Anomaly tiers**
  - **CURSED** — weight `≤ 0` or non-finite → excluded from every MST pass.
  - **SUSPICIOUS** — out of the declared `[1, 20]` range, self-loops,
    parallel edges.
  - **WATCH** — statistical outlier (`|z-score| > 2`).

Verified: the incremental MST produces **the same total weight** as a full
Kruskal rebuild on every sequence of mutations tested.

---

## Seed

The initial web ships with one deliberately planted **cursed thread**
(Franklin ↔ Kalluto, weight `−3`) to prove the detector excludes it. Remove or
retune it from the UI and watch the anomaly report clear.
