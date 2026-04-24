/**
 * Graph module - Handles basic CRUD operations for edges.
 */

import { graph } from './state.js';
import { mstIncrementalOnAdd, mstIncrementalOnRemove } from './mst.js';

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
