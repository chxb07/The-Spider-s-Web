/**
 * Anomaly Detection module - Identifies "cursed" or suspicious edges in the web.
 */

import { graph, nm } from './state.js';

export const WEIGHT_MIN = 1;
export const WEIGHT_MAX = 20;

/**
 * Checks if an edge is valid for inclusion in the MST.
 * (Not cursed, finite positive weight, no self-loops).
 */
export function isValidForMST(e) {
  return Number.isFinite(e.weight) && e.weight > 0 && e.a !== e.b;
}

/**
 * Scans the entire graph for anomalies.
 */
export function detectAnomaly() {
  const anomalies = [];
  const weights = [];
  const pairSeen = new Map();

  for (const e of graph.edges.values()) {
    const key = e.a < e.b ? `${e.a}-${e.b}` : `${e.b}-${e.a}`;
    if (!pairSeen.has(key)) pairSeen.set(key, []);
    pairSeen.get(key).push(e.id);

    if (!Number.isFinite(e.weight)) {
      anomalies.push({ 
        edgeId: e.id, 
        level: "cursed", 
        code: "NOT_FINITE",
        message: `Edge #${e.id} (${nm(e.a)}↔${nm(e.b)}) weight is not a finite number.` 
      });
      continue;
    }
    if (e.weight <= 0) {
      anomalies.push({ 
        edgeId: e.id, 
        level: "cursed", 
        code: "NON_POSITIVE",
        message: `Edge #${e.id} (${nm(e.a)}↔${nm(e.b)}) has weight ${e.weight} — a stable web requires strictly positive threads.` 
      });
      continue;
    }
    if (e.weight < WEIGHT_MIN || e.weight > WEIGHT_MAX) {
      anomalies.push({ 
        edgeId: e.id, 
        level: "suspicious", 
        code: "OUT_OF_RANGE",
        message: `Edge #${e.id} (${nm(e.a)}↔${nm(e.b)}) weight ${e.weight} is outside the valid range [${WEIGHT_MIN}, ${WEIGHT_MAX}].` 
      });
    }
    if (e.a === e.b) {
      anomalies.push({ 
        edgeId: e.id, 
        level: "suspicious", 
        code: "SELF_LOOP",
        message: `Edge #${e.id} is a self-loop on ${nm(e.a)}.` 
      });
    }
    weights.push(e.weight);
  }

  // Duplicate detection
  for (const [key, ids] of pairSeen) {
    if (ids.length > 1) {
      anomalies.push({ 
        edgeId: ids[0], 
        level: "suspicious", 
        code: "DUPLICATE",
        message: `Parallel threads exist between ${key.split("-").map(i => nm(+i)).join("↔")} (edges ${ids.join(", ")}).` 
      });
    }
  }

  // Statistical outlier detection
  if (weights.length >= 4) {
    const mean = weights.reduce((a, b) => a + b, 0) / weights.length;
    const variance = weights.reduce((s, w) => s + (w - mean) ** 2, 0) / weights.length;
    const sd = Math.sqrt(variance);
    
    if (sd > 0) {
      for (const e of graph.edges.values()) {
        if (e.weight <= 0 || !Number.isFinite(e.weight)) continue;
        const z = (e.weight - mean) / sd;
        if (Math.abs(z) > 2) {
          anomalies.push({ 
            edgeId: e.id, 
            level: "watch", 
            code: "OUTLIER",
            message: `Edge #${e.id} (${nm(e.a)}↔${nm(e.b)}) weight ${e.weight} is a statistical outlier (z=${z.toFixed(2)}).` 
          });
        }
      }
    }
  }
  
  return anomalies;
}

/**
 * Returns a suspicion level and description for a specific edge.
 */
export function suspicionLevelFor(e) {
  if (!Number.isFinite(e.weight) || e.weight <= 0) {
    return { 
      label: "CURSED", 
      color: "var(--danger)",
      reason: "Weight violates the strictly-positive rule." 
    };
  }
  if (e.weight < WEIGHT_MIN || e.weight > WEIGHT_MAX) {
    return { 
      label: "HIGH", 
      color: "var(--danger)",
      reason: `Weight is outside the declared range [${WEIGHT_MIN}, ${WEIGHT_MAX}].` 
    };
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
