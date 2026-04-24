/**
 * Graph module - Handles graph data structure and basic CRUD operations.
 */

import { mstIncrementalOnAdd, mstIncrementalOnRemove } from './mst.js';

export const MEMBERS = [
  "Chrollo", "Franklin", "Feitan", "Machi", "Nobunaga",
  "Shalnark", "Phinks", "Pakunoda", "Shizuku", "Bonolenov",
  "Uvogin", "Kortopi", "Kalluto"
];

export const graph = {
  nodes: MEMBERS.map((name, i) => ({ id: i, name })),
  edges: new Map(),
  adjacency: new Map(),
  mst: new Set(),
  mstWeight: 0,
  nextEdgeId: 1,
  selectedEdgeId: null,
  highlightedNode: null
};

// Initialize adjacency list
MEMBERS.forEach((_, i) => graph.adjacency.set(i, new Set()));

/**
 * Returns the name of a member by ID.
 */
export function nm(id) {
  return MEMBERS[id];
}

/**
 * Adds a new edge to the graph and updates the MST incrementally.
 */
export function addEdge(edge) {
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

/**
 * Removes an edge from the graph and updates the MST incrementally if needed.
 */
export function removeEdge(edgeId) {
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

/**
 * Updates the weight of an edge and triggers incremental MST updates.
 */
export function updateWeight(edgeId, newWeight) {
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
