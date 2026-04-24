/**
 * Events module - Handles UI interaction and form submissions.
 */

import { graph } from './state.js?v=2';
import { addEdge, removeEdge, updateWeight } from './graph.js?v=2';
import { 
  render, 
  renderNodes, 
  renderSearchResult, 
  renderSelectedInfo, 
  populateNodeSelect 
} from './render.js?v=2';

console.log("✅ events.js loaded");

/**
 * Attaches event listeners to all UI forms and buttons.
 */
function wireForms() {
  const addA = document.getElementById("add-a");
  const addB = document.getElementById("add-b");
  const srchNode = document.getElementById("srch-node");
  const formAdd = document.getElementById("form-add");
  const formUpdate = document.getElementById("form-update");
  const formRemove = document.getElementById("form-remove");
  const formSearch = document.getElementById("form-search");

  if (addA) populateNodeSelect(addA);
  if (addB) {
    populateNodeSelect(addB);
    addB.selectedIndex = 1;
  }
  if (srchNode) populateNodeSelect(srchNode);

  // Form: Add Edge
  if (formAdd) {
    formAdd.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const a = Number(document.getElementById("add-a").value);
      const b = Number(document.getElementById("add-b").value);
      const w = Number(document.getElementById("add-w").value);
      
      const res = addEdge({ a, b, weight: w });
      if (!res.ok) alert(res.reason);
      render();
    });
  }

  // Form: Update Weight
  if (formUpdate) {
    formUpdate.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const id = Number(document.getElementById("upd-edge").value);
      const w = Number(document.getElementById("upd-w").value);
      if (!id) return;
      
      updateWeight(id, w);
      render();
      if (graph.selectedEdgeId === id) renderSelectedInfo();
    });
  }

  // Form: Remove Edge
  if (formRemove) {
    formRemove.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const id = Number(document.getElementById("rem-edge").value);
      if (!id) return;
      
      removeEdge(id);
      render();
      renderSelectedInfo();
    });
  }

  // Form: Search Node
  if (formSearch) {
    formSearch.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const id = Number(document.getElementById("srch-node").value);
      
      graph.highlightedNode = id;
      renderNodes();
      renderSearchResult(id);
    });
  }
}

export { wireForms };
