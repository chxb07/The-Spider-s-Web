/**
 * Events module - Handles UI interaction and form submissions.
 */

import { graph, addEdge, removeEdge, updateWeight } from './graph.js';
import { 
  render, 
  renderNodes, 
  renderSearchResult, 
  renderSelectedInfo, 
  populateNodeSelect 
} from './render.js';

/**
 * Attaches event listeners to all UI forms and buttons.
 */
export function wireForms() {
  populateNodeSelect(document.getElementById("add-a"));
  populateNodeSelect(document.getElementById("add-b"));
  populateNodeSelect(document.getElementById("srch-node"));
  
  // Default to a different node for B
  document.getElementById("add-b").selectedIndex = 1;

  // Form: Add Edge
  document.getElementById("form-add").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const a = Number(document.getElementById("add-a").value);
    const b = Number(document.getElementById("add-b").value);
    const w = Number(document.getElementById("add-w").value);
    
    const res = addEdge({ a, b, weight: w });
    if (!res.ok) alert(res.reason);
    render();
  });

  // Form: Update Weight
  document.getElementById("form-update").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const id = Number(document.getElementById("upd-edge").value);
    const w = Number(document.getElementById("upd-w").value);
    if (!id) return;
    
    updateWeight(id, w);
    render();
    if (graph.selectedEdgeId === id) renderSelectedInfo();
  });

  // Form: Remove Edge
  document.getElementById("form-remove").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const id = Number(document.getElementById("rem-edge").value);
    if (!id) return;
    
    removeEdge(id);
    render();
    renderSelectedInfo();
  });

  // Form: Search Node
  document.getElementById("form-search").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const id = Number(document.getElementById("srch-node").value);
    
    graph.highlightedNode = id;
    renderNodes();
    renderSearchResult(id);
  });
}
