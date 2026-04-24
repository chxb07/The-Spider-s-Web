/**
 * State module - Centralized source of truth for the graph data.
 * This file breaks circular dependencies between logic modules.
 */

console.log("✅ state.js loaded");

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
 * Helper to get member name by ID.
 */
export function nm(id) {
  return MEMBERS[id];
}
