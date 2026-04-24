/**
 * Render module - Handles all SVG and DOM rendering logic.
 */

import { graph, nm } from './graph.js';
import { detectAnomaly, suspicionLevelFor } from './anomaly.js';

const SVG_NS = "http://www.w3.org/2000/svg";
const CX = 360, CY = 360, R_LAYOUT = 265, R_NODE = 26;

// Pre-calculate node positions in a circle
export const nodePos = graph.nodes.map((_, i) => {
  const theta = (i / graph.nodes.length) * Math.PI * 2 - Math.PI / 2;
  return { 
    x: CX + R_LAYOUT * Math.cos(theta), 
    y: CY + R_LAYOUT * Math.sin(theta) 
  };
});

const edgesLayer = document.getElementById("edges-layer");
const nodesLayer = document.getElementById("nodes-layer");

/**
 * Main render function - refreshes all UI components.
 */
export function render() {
  renderEdges();
  renderNodes();
  renderMstPanel();
  renderAnomalyPanel();
  refreshEdgeSelects();
}

/**
 * Renders the edges in the SVG layer.
 */
function renderEdges() {
  edgesLayer.innerHTML = "";
  const cursedIds = new Set(
    detectAnomaly()
      .filter(a => a.level === "cursed")
      .map(a => a.edgeId)
  );
  
  for (const e of graph.edges.values()) {
    const p1 = nodePos[e.a], p2 = nodePos[e.b];
    const group = document.createElementNS(SVG_NS, "g");
    group.dataset.edgeId = e.id;

    // Invisible thick line for easier clicking
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

/**
 * Renders the nodes in the SVG layer.
 */
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

/**
 * Updates the MST summary and edge list in the sidebar.
 */
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

/**
 * Updates the anomaly report in the sidebar.
 */
function renderAnomalyPanel() {
  const box = document.getElementById("anomaly-report");
  const anomalies = detectAnomaly();
  
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

/**
 * Displays details of the currently selected edge.
 */
export function renderSelectedInfo() {
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

/**
 * Populates a <select> with all available nodes.
 */
export function populateNodeSelect(sel) {
  sel.innerHTML = graph.nodes
    .map(n => `<option value="${n.id}">${n.name}</option>`).join("");
}

/**
 * Refreshes the edge selection dropdowns in the forms.
 */
export function refreshEdgeSelects() {
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

/**
 * Displays the result of a node search (its connections).
 */
export function renderSearchResult(nodeId) {
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
