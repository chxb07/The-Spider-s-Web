/**
 * Main Application Entry Point
 * Wires together the modules and initializes the spider's web.
 */

import { graph } from './state.js?v=2';
import { computeMST } from './mst.js?v=2';
import { render, renderSelectedInfo } from './render.js?v=2';
import { wireForms } from './events.js?v=2';

console.log("✅ app.js loaded");

/**
 * Populates the graph with initial "seed" data from the script's origin.
 */
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
  
  // Initial full MST calculation
  computeMST();
}

// Initialize the application
function init() {
  seed();
  wireForms();
  render();
  renderSelectedInfo();
}

// Start the web
init();
