const MEMBERS = [
  "Chrollo", "Franklin", "Feitan", "Machi", "Nobunaga",
  "Shalnark", "Phinks",  "Pakunoda", "Shizuku", "Bonolenov",
  "Uvogin",  "Kortopi",  "Kalluto"
];

const WEIGHT_MIN = 1;
const WEIGHT_MAX = 20;

const graph = {
  nodes: MEMBERS.map((name, i) => ({ id: i, name })),
  edges: new Map(),
  adjacency: new Map(),
  mst: new Set(),
  mstWeight: 0,
  nextEdgeId: 1,
  selectedEdgeId: null,
  highlightedNode: null
};
MEMBERS.forEach((_, i) => graph.adjacency.set(i, new Set()));

function addEdge(graph, edge) {

  if (edge.a === edge.b) {
    return { ok: false, reason: "Self-loop rejected" };
  }
  const id = graph.nextEdgeId++;
  const record = { id, a: edge.a, b: edge.b, weight: Number(edge.weight) };
  graph.edges.set(id, record);
  graph.adjacency.get(record.a).add(id);
  graph.adjacency.get(record.b).add(id);
  mstIncrementalOnAdd(record);
  return { ok: true, id };
}

function removeEdge(graph, edgeId) {
  const e = graph.edges.get(edgeId);
  if (!e) return { ok: false, reason: "Edge not found" };
  graph.adjacency.get(e.a).delete(edgeId);
  graph.adjacency.get(e.b).delete(edgeId);
  graph.edges.delete(edgeId);
  const wasInMst = graph.mst.has(edgeId);
  if (wasInMst) {
    graph.mst.delete(edgeId);
    graph.mstWeight -= e.weight;
    mstIncrementalOnRemove(e);
  }
  if (graph.selectedEdgeId === edgeId) graph.selectedEdgeId = null;
  return { ok: true, wasInMst };
}

function updateWeight(graph, edgeId, newWeight) {
  const e = graph.edges.get(edgeId);
  if (!e) return { ok: false, reason: "Edge not found" };
  const oldW = e.weight;
  e.weight = Number(newWeight);

  if (graph.mst.has(edgeId)) {
    graph.mst.delete(edgeId);
    graph.mstWeight -= oldW;
    mstIncrementalOnRemove(e);
  }
  mstIncrementalOnAdd(e);
  return { ok: true };
}

function computeMST(graph) {

  const dsu = new DSU(graph.nodes.length);
  const sorted = [...graph.edges.values()]
    .filter(e => isValidForMST(e))
    .sort((x, y) => x.weight - y.weight);
  const mst = new Set();
  let total = 0;
  for (const e of sorted) {
    if (dsu.union(e.a, e.b)) {
      mst.add(e.id);
      total += e.weight;
      if (mst.size === graph.nodes.length - 1) break;
    }
  }
  graph.mst = mst;
  graph.mstWeight = total;
  return { mst, total };
}

function detectAnomaly(graph) {

  const anomalies = [];
  const weights = [];
  const pairSeen = new Map();

  for (const e of graph.edges.values()) {
    const key = e.a < e.b ? `${e.a}-${e.b}` : `${e.b}-${e.a}`;
    if (!pairSeen.has(key)) pairSeen.set(key, []);
    pairSeen.get(key).push(e.id);

    if (!Number.isFinite(e.weight)) {
      anomalies.push({ edgeId: e.id, level: "cursed", code: "NOT_FINITE",
        message: `Edge #${e.id} (${nm(e.a)}↔${nm(e.b)}) weight is not a finite number.` });
      continue;
    }
    if (e.weight <= 0) {
      anomalies.push({ edgeId: e.id, level: "cursed", code: "NON_POSITIVE",
        message: `Edge #${e.id} (${nm(e.a)}↔${nm(e.b)}) has weight ${e.weight} — a stable web requires strictly positive threads.` });
      continue;
    }
    if (e.weight < WEIGHT_MIN || e.weight > WEIGHT_MAX) {
      anomalies.push({ edgeId: e.id, level: "suspicious", code: "OUT_OF_RANGE",
        message: `Edge #${e.id} (${nm(e.a)}↔${nm(e.b)}) weight ${e.weight} is outside the valid range [${WEIGHT_MIN}, ${WEIGHT_MAX}].` });
    }
    if (e.a === e.b) {
      anomalies.push({ edgeId: e.id, level: "suspicious", code: "SELF_LOOP",
        message: `Edge #${e.id} is a self-loop on ${nm(e.a)}.` });
    }
    weights.push(e.weight);
  }

  for (const [key, ids] of pairSeen) {
    if (ids.length > 1) {
      anomalies.push({ edgeId: ids[0], level: "suspicious", code: "DUPLICATE",
        message: `Parallel threads exist between ${key.split("-").map(i => nm(+i)).join("↔")} (edges ${ids.join(", ")}).` });
    }
  }

  if (weights.length >= 4) {
    const mean = weights.reduce((a, b) => a + b, 0) / weights.length;
    const variance = weights.reduce((s, w) => s + (w - mean) ** 2, 0) / weights.length;
    const sd = Math.sqrt(variance);
    if (sd > 0) {
      for (const e of graph.edges.values()) {
        if (e.weight <= 0 || !Number.isFinite(e.weight)) continue;
        const z = (e.weight - mean) / sd;
        if (Math.abs(z) > 2) {
          anomalies.push({ edgeId: e.id, level: "watch", code: "OUTLIER",
            message: `Edge #${e.id} (${nm(e.a)}↔${nm(e.b)}) weight ${e.weight} is a statistical outlier (z=${z.toFixed(2)}).` });
        }
      }
    }
  }
  return anomalies;
}

function isValidForMST(e) {
  return Number.isFinite(e.weight) && e.weight > 0 && e.a !== e.b;
}

function nm(id) { return MEMBERS[id]; }

class DSU {
  constructor(n) {
    this.p = Array.from({ length: n }, (_, i) => i);
    this.r = new Array(n).fill(0);
  }
  find(x) {
    while (this.p[x] !== x) { this.p[x] = this.p[this.p[x]]; x = this.p[x]; }
    return x;
  }
  union(a, b) {
    const ra = this.find(a), rb = this.find(b);
    if (ra === rb) return false;
    if (this.r[ra] < this.r[rb]) this.p[ra] = rb;
    else if (this.r[ra] > this.r[rb]) this.p[rb] = ra;
    else { this.p[rb] = ra; this.r[ra]++; }
    return true;
  }
}

function mstIncrementalOnAdd(e) {
  if (!isValidForMST(e)) return;
  const pathEdge = findMaxEdgeOnMstPath(e.a, e.b);
  if (pathEdge === null) {

    graph.mst.add(e.id);
    graph.mstWeight += e.weight;
    return;
  }
  if (e.weight < pathEdge.weight) {
    graph.mst.delete(pathEdge.id);
    graph.mstWeight -= pathEdge.weight;
    graph.mst.add(e.id);
    graph.mstWeight += e.weight;
  }
}

function mstIncrementalOnRemove(removed) {
  const side = componentSideAfterRemoval(removed);
  if (!side) return;
  let best = null;
  for (const e of graph.edges.values()) {
    if (graph.mst.has(e.id)) continue;
    if (!isValidForMST(e)) continue;
    if (side[e.a] !== side[e.b]) {
      if (!best || e.weight < best.weight) best = e;
    }
  }
  if (best) {
    graph.mst.add(best.id);
    graph.mstWeight += best.weight;
  }
}

function findMaxEdgeOnMstPath(a, b) {
  const prevEdge = new Map();
  const visited = new Set([a]);
  const queue = [a];
  let found = false;
  while (queue.length) {
    const u = queue.shift();
    if (u === b) { found = true; break; }
    for (const eid of graph.adjacency.get(u)) {
      if (!graph.mst.has(eid)) continue;
      const e = graph.edges.get(eid);
      const v = (e.a === u) ? e.b : e.a;
      if (visited.has(v)) continue;
      visited.add(v);
      prevEdge.set(v, e);
      queue.push(v);
    }
  }
  if (!found) return null;

  let cur = b, heaviest = null;
  while (cur !== a) {
    const e = prevEdge.get(cur);
    if (!heaviest || e.weight > heaviest.weight) heaviest = e;
    cur = (e.a === cur) ? e.b : e.a;
  }
  return heaviest;
}

function componentSideAfterRemoval(removed) {
  const side = new Array(graph.nodes.length).fill(-1);
  function bfs(start, tag) {
    const q = [start];
    side[start] = tag;
    while (q.length) {
      const u = q.shift();
      for (const eid of graph.adjacency.get(u)) {
        if (!graph.mst.has(eid)) continue;
        const e = graph.edges.get(eid);
        const v = (e.a === u) ? e.b : e.a;
        if (side[v] !== -1) continue;
        side[v] = tag;
        q.push(v);
      }
    }
  }
  bfs(removed.a, 0);
  if (side[removed.b] === -1) bfs(removed.b, 1);
  return side;
}

const SVG_NS = "http://www.w3.org/2000/svg";
const CX = 360, CY = 360, R_LAYOUT = 265, R_NODE = 26;

const nodePos = graph.nodes.map((_, i) => {
  const theta = (i / graph.nodes.length) * Math.PI * 2 - Math.PI / 2;
  return { x: CX + R_LAYOUT * Math.cos(theta), y: CY + R_LAYOUT * Math.sin(theta) };
});

const edgesLayer = document.getElementById("edges-layer");
const nodesLayer = document.getElementById("nodes-layer");

function render() {
  renderEdges();
  renderNodes();
  renderMstPanel();
  renderAnomalyPanel();
  refreshEdgeSelects();
}

function renderEdges() {
  edgesLayer.innerHTML = "";
  const cursedIds = new Set(
    detectAnomaly(graph)
      .filter(a => a.level === "cursed")
      .map(a => a.edgeId)
  );
  for (const e of graph.edges.values()) {
    const p1 = nodePos[e.a], p2 = nodePos[e.b];
    const group = document.createElementNS(SVG_NS, "g");
    group.dataset.edgeId = e.id;

    const hit = document.createElementNS(SVG_NS, "line");
    hit.setAttribute("x1", p1.x); hit.setAttribute("y1", p1.y);
    hit.setAttribute("x2", p2.x); hit.setAttribute("y2", p2.y);
    hit.setAttribute("class", "edge-hit");

    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", p1.x); line.setAttribute("y1", p1.y);
    line.setAttribute("x2", p2.x); line.setAttribute("y2", p2.y);
    let cls = "edge-line";
    if (cursedIds.has(e.id)) cls += " cursed";
    else if (graph.mst.has(e.id)) cls += " mst";
    if (graph.selectedEdgeId === e.id) cls += " selected";
    line.setAttribute("class", cls);

    const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("x", mx); label.setAttribute("y", my - 4);
    label.setAttribute("class", "edge-label");
    label.textContent = String(e.weight);

    group.appendChild(hit);
    group.appendChild(line);
    group.appendChild(label);
    group.addEventListener("click", () => {
      graph.selectedEdgeId = e.id;
      renderEdges();
      renderSelectedInfo();
    });
    edgesLayer.appendChild(group);
  }
}

function renderNodes() {
  nodesLayer.innerHTML = "";
  graph.nodes.forEach((n, i) => {
    const p = nodePos[i];
    const g = document.createElementNS(SVG_NS, "g");

    const c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("cx", p.x); c.setAttribute("cy", p.y);
    c.setAttribute("r", R_NODE);
    let cls = "node-circle";
    if (graph.highlightedNode === i) cls += " highlight";
    c.setAttribute("class", cls);

    const txt = document.createElementNS(SVG_NS, "text");
    txt.setAttribute("x", p.x);
    txt.setAttribute("y", p.y + 4);
    txt.setAttribute("class", "node-label");
    txt.textContent = n.name;

    g.appendChild(c);
    g.appendChild(txt);
    nodesLayer.appendChild(g);
  });
}

function renderMstPanel() {
  const summary = document.getElementById("mst-summary");
  const list = document.getElementById("mst-list");
  const size = graph.mst.size;
  const expected = graph.nodes.length - 1;
  const connected = size === expected;
  summary.innerHTML =
    `Total weight: <strong>${graph.mstWeight}</strong> · ` +
    `Edges: <strong>${size}/${expected}</strong> ` +
    (connected ? "· <span style='color:var(--mst)'>Spanning ✓</span>"
               : "· <span style='color:var(--warn)'>Forest (disconnected)</span>");
  list.innerHTML = "";
  const mstEdges = [...graph.mst].map(id => graph.edges.get(id))
    .sort((a, b) => a.weight - b.weight);
  for (const e of mstEdges) {
    const li = document.createElement("li");
    li.innerHTML = `<span>#${e.id} · ${nm(e.a)} ↔ ${nm(e.b)}</span><span class="w">${e.weight}</span>`;
    list.appendChild(li);
  }
  if (!mstEdges.length) {
    const li = document.createElement("li");
    li.style.borderLeftColor = "var(--muted)";
    li.textContent = "No MST edges yet.";
    list.appendChild(li);
  }
}

function renderAnomalyPanel() {
  const box = document.getElementById("anomaly-report");
  const anomalies = detectAnomaly(graph);
  if (!anomalies.length) {
    box.innerHTML = "<em style='color:var(--muted)'>No anomalies detected. The web is stable.</em>";
    return;
  }
  const cursed = anomalies.filter(a => a.level === "cursed");
  const rest   = anomalies.filter(a => a.level !== "cursed");
  let html = "";
  if (cursed.length) {
    html += `<div class="bad">⚠ Cursed edge${cursed.length > 1 ? "s" : ""} detected — excluded from MST:</div><ul>`;
    for (const a of cursed) html += `<li>${a.message} <small>[${a.code}]</small></li>`;
    html += "</ul>";
  }
  if (rest.length) {
    html += `<div class="warn">Suspicious findings:</div><ul>`;
    for (const a of rest) html += `<li>${a.message} <small>[${a.code}]</small></li>`;
    html += "</ul>";
  }
  box.innerHTML = html;
}

function renderSelectedInfo() {
  const box = document.getElementById("selected-info");
  const id = graph.selectedEdgeId;
  if (!id || !graph.edges.has(id)) {
    box.textContent = "Click an edge in the web to inspect.";
    return;
  }
  const e = graph.edges.get(id);
  const suspicion = suspicionLevelFor(e);
  const inMst = graph.mst.has(id);
  box.innerHTML = `
    <div><strong>Edge #${e.id}</strong> — ${nm(e.a)} ↔ ${nm(e.b)}</div>
    <div>Weight: <strong>${e.weight}</strong></div>
    <div>In MST: ${inMst ? "<span style='color:var(--mst)'>Yes</span>"
                        : "<span style='color:var(--muted)'>No</span>"}</div>
    <div>Suspicion: <strong style="color:${suspicion.color}">${suspicion.label}</strong></div>
    <div style="color:var(--muted); font-size:12px; margin-top:4px">${suspicion.reason}</div>`;
}

function suspicionLevelFor(e) {
  if (!Number.isFinite(e.weight) || e.weight <= 0) {
    return { label: "CURSED", color: "var(--danger)",
             reason: "Weight violates the strictly-positive rule." };
  }
  if (e.weight < WEIGHT_MIN || e.weight > WEIGHT_MAX) {
    return { label: "HIGH", color: "var(--danger)",
             reason: `Weight is outside the declared range [${WEIGHT_MIN}, ${WEIGHT_MAX}].` };
  }
  const ws = [...graph.edges.values()]
    .filter(x => Number.isFinite(x.weight) && x.weight > 0)
    .map(x => x.weight);
  if (ws.length >= 4) {
    const mean = ws.reduce((a, b) => a + b, 0) / ws.length;
    const sd = Math.sqrt(ws.reduce((s, w) => s + (w - mean) ** 2, 0) / ws.length);
    if (sd > 0) {
      const z = Math.abs((e.weight - mean) / sd);
      if (z > 2)   return { label: "MEDIUM", color: "var(--warn)",  reason: `Statistical outlier (z=${z.toFixed(2)}).` };
      if (z > 1.2) return { label: "LOW",    color: "var(--accent)", reason: `Slightly above average deviation (z=${z.toFixed(2)}).` };
    }
  }
  return { label: "NONE", color: "var(--mst)", reason: "Within normal parameters." };
}

function populateNodeSelect(sel) {
  sel.innerHTML = graph.nodes
    .map(n => `<option value="${n.id}">${n.name}</option>`).join("");
}

function refreshEdgeSelects() {
  const options = [...graph.edges.values()]
    .sort((x, y) => x.id - y.id)
    .map(e => `<option value="${e.id}">#${e.id} · ${nm(e.a)} ↔ ${nm(e.b)} (w=${e.weight})</option>`)
    .join("");
  for (const id of ["upd-edge", "rem-edge"]) {
    const sel = document.getElementById(id);
    const prev = sel.value;
    sel.innerHTML = options || `<option value="">— no edges —</option>`;
    if (prev && graph.edges.has(Number(prev))) sel.value = prev;
  }
}

function wireForms() {
  populateNodeSelect(document.getElementById("add-a"));
  populateNodeSelect(document.getElementById("add-b"));
  populateNodeSelect(document.getElementById("srch-node"));
  document.getElementById("add-b").selectedIndex = 1;

  document.getElementById("form-add").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const a = Number(document.getElementById("add-a").value);
    const b = Number(document.getElementById("add-b").value);
    const w = Number(document.getElementById("add-w").value);
    const res = addEdge(graph, { a, b, weight: w });
    if (!res.ok) alert(res.reason);
    render();
  });

  document.getElementById("form-update").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const id = Number(document.getElementById("upd-edge").value);
    const w = Number(document.getElementById("upd-w").value);
    if (!id) return;
    updateWeight(graph, id, w);
    render();
    if (graph.selectedEdgeId === id) renderSelectedInfo();
  });

  document.getElementById("form-remove").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const id = Number(document.getElementById("rem-edge").value);
    if (!id) return;
    removeEdge(graph, id);
    render();
    renderSelectedInfo();
  });

  document.getElementById("form-search").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const id = Number(document.getElementById("srch-node").value);
    graph.highlightedNode = id;
    renderNodes();
    renderSearchResult(id);
  });
}

function renderSearchResult(nodeId) {
  const box = document.getElementById("search-result");
  const eids = [...graph.adjacency.get(nodeId)];
  if (!eids.length) {
    box.innerHTML = `<em>${nm(nodeId)} has no active threads.</em>`;
    return;
  }
  const rows = eids
    .map(id => graph.edges.get(id))
    .sort((a, b) => a.weight - b.weight)
    .map(e => {
      const other = (e.a === nodeId) ? e.b : e.a;
      const tag = graph.mst.has(e.id)
        ? "<span style='color:var(--mst)'>[MST]</span>"
        : (suspicionLevelFor(e).label === "CURSED"
            ? "<span style='color:var(--danger)'>[CURSED]</span>" : "");
      return `<li>#${e.id} → ${nm(other)} · weight ${e.weight} ${tag}</li>`;
    }).join("");
  box.innerHTML = `<div>${nm(nodeId)} has <strong>${eids.length}</strong> thread(s):</div><ul>${rows}</ul>`;
}

function seed() {

  const seedEdges = [
    [0, 1,  5], [0, 3,  3], [0, 7,  4], [0, 6,  9],
    [1, 10, 5], [2, 6,  2], [2, 4,  7], [3, 4,  6],
    [5, 7,  3], [5, 11, 8], [10, 4, 4], [9, 2,  9],
    [12, 8, 10], [8, 11, 6], [11, 1,  7],
    [1, 12, -3]
  ];
  for (const [a, b, w] of seedEdges) {
    const id = graph.nextEdgeId++;
    graph.edges.set(id, { id, a, b, weight: w });
    graph.adjacency.get(a).add(id);
    graph.adjacency.get(b).add(id);
  }
  computeMST(graph);
}

seed();
wireForms();
render();
renderSelectedInfo();
