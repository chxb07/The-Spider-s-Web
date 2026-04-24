/**
 * MST module - Implements Kruskal's algorithm and incremental MST updates.
 */

import { graph } from './graph.js';
import { isValidForMST } from './anomaly.js';

/**
 * Disjoint Set Union (DSU) / Union-Find structure.
 */
export class DSU {
  constructor(n) {
    this.p = Array.from({ length: n }, (_, i) => i);
    this.r = new Array(n).fill(0);
  }
  
  find(x) {
    while (this.p[x] !== x) { 
      this.p[x] = this.p[this.p[x]]; 
      x = this.p[x]; 
    }
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

/**
 * Recomputes the entire MST from scratch using Kruskal's algorithm.
 */
export function computeMST() {
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

/**
 * Handles incremental updates when an edge is added or weight is decreased.
 */
export function mstIncrementalOnAdd(e) {
  if (!isValidForMST(e)) return;
  
  const pathEdge = findMaxEdgeOnMstPath(e.a, e.b);
  if (pathEdge === null) {
    // Different components merged
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

/**
 * Handles incremental updates when an MST edge is removed or weight is increased.
 */
export function mstIncrementalOnRemove(removed) {
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

/**
 * Finds the edge with the maximum weight on the MST path between a and b.
 */
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

/**
 * Identifies which component each node belongs to after an MST edge removal.
 */
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
